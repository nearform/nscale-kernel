/*
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

var fs = require('fs');
var _ = require('underscore');
var rd = require('rus-diff');
var uuid = require('uuid');
var executor = require('../../util/executor');
var planner = require('nfd-planner')
var async = require('async');

module.exports = function(options) {


  // TODO move this somewhere else!
  function getCommandExecutor(type) {
    var nop = function(name) {
      console.log('--> ', name, arguments[3].id)
      return arguments[arguments.length - 1]()
    }

    //if (type !== 'docker') {
      return {
        add: nop.bind(null, 'add'),
        start: nop.bind(null, 'start'),
        link: nop.bind(null, 'link'),
        unlink: nop.bind(null, 'unlink'),
        stop: nop.bind(null, 'stop'),
        remove: nop.bind(null, 'remove')
      }
    //}

    //return {
    //  add: nop,
    //  start: deployDockerContainer,
    //  link: nop,
    //  unlink: nop,
    //  stop: stopDockerContainer,
    //  remove: nop
    //}
  }



  /**
   * Deploy a plan
   * See https://github.com/nearform/nfd-planner for a plan example.
   */
  var deployPlan = function(origin, target, plan, out, cb) {
    var container;
    var containerDef;
    var commandExecutor;
    var done = false;
    var tickSize = 100 / plan.length;
    var currProgress = 0;

    function tick() {
      currProgress += tickSize;
      out.stdout(currProgress, 'progress');
    }

    async.eachSeries(plan, function(step, cb) {
      if (target.system.topology.containers[step.id]) {
        container = target.system.topology.containers[step.id];
        containerDef = _.find(target.system.containerDefinitions, function(cdef) {
          return cdef.id === container.containerDefinitionId;
        });
      } else {
        container = origin.system.topology.containers[step.id];
        containerDef = _.find(origin.system.containerDefinitions, function(cdef) {
          return cdef.id === container.containerDefinitionId;
        });
      }

      commandExecutor = getCommandExecutor(containerDef.type);
      commandExecutor[step.cmd](target, containerDef, container, out, function(err, result){
        tick();
        /// then need to mark the system deployed
        cb(err, result);
      });
    }, cb)
  };



  /**
   * docker specific deploy - hacked only
   */
  var deploy = function(systemId, revisionId, db, cl, out, cb) {
    out.stdout('deploying...');
    out.stdout(0, 'progress');

    cl.getDeployedRevision(systemId, function(err, deployed) {
      if (err) { return cb(err); }
      if (!deployed) {
        deployed = {'name': 'white sheet',
                    'namespace': 'white sheet',
                    'containerDefinitions': [],
                    'topology': {
                      'containers': {}}};
      }


      cl.getRevision(systemId, revisionId, function(err, target) {
        if (err) { return cb(err); }

        if (target) {

          var plan = planner(deployed.system, target.system)
          if (!plan) {
            out.stdout('Unable to plan! -- THIS IS SERIOUS, please report it', 'warn');
            cb(new Error('Unable to plan! -- THIS IS SERIOUS, please report it'));
          }
          else if(plan.length === 0) {
            out.stdout('Nothing to do -- if it should do something, please report it', 'warn');
            cb()
          }
          else {
            deployPlan(deployed, target, plan, out, function(err) {
              cl.markDeployedRevision(systemId, revisionId, cb);
            });
          }
        }
        else {
          out.stdout('no target revision - aborting', 'warn');
          cb(new Error('no target revision'));
        }
      });
    });
  };



  var construct = function() {
  };



  construct();
  return {
    deploy: deploy,
  };
};

