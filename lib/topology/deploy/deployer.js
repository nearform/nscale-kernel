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

var _ = require('underscore');
var planner = require('nfd-planner');
var async = require('async');
var sv = require('./semver')();



module.exports = function() {



  /**
   * Deploy a plan
   * See https://github.com/nearform/nfd-planner for a plan example.
   *
   * origin - origin system definition
   * target - target system definition
   * plan   - execution plan
   * mode   - preview or live
   * out    - output handles
   * cb     - completion callback
   */
  var deployPlan = function(origin, target, plan, mode, out, cb) {
    var container;
    var containerDef;
    var commandExecutor;
    var tickSize = 100 / plan.length;
    var currProgress = 0;
    var prnt;
    var executor = require('./executor/executor')(mode);

    console.log('DEPLOYPLAY!');
    function tick() {
      currProgress += tickSize;
      out.stdout(currProgress, 'progress');
    }

    console.log(JSON.stringify(plan, null, 2));

    async.eachSeries(plan, function(step, cb) {
      if (target.topology.containers[step.id]) {
        container = target.topology.containers[step.id];
        prnt = target.topology.containers[container.containedBy];
        containerDef = _.find(target.containerDefinitions, function(cdef) {
          return cdef.id === container.containerDefinitionId;
        });
      } 
      else {
        container = origin.topology.containers[step.id];
        prnt = origin.topology.containers[container.containedBy];
        containerDef = _.find(origin.containerDefinitions, function(cdef) {
          return cdef.id === container.containerDefinitionId;
        });
      }


      console.log('CALLING: ' + step.cmd);
      commandExecutor = executor.match(containerDef.type);
      commandExecutor[step.cmd](prnt.specific, target, containerDef, container, out, function(err, result){
        tick();
        cb(err, result);
      });
    }, cb);
  };



  /**
   * docker specific deploy - hacked only
   */
  var deploy = function(user, systemId, revisionId, sr, mode, out, cb) {
    var semCheck;
    out.stdout('deploying...');
    out.stdout(0, 'progress');

    debugger;
    sr.getDeployedRevision(systemId, function(err, deployed) {
      debugger;
      if (err) { return cb(err); }
      if (!deployed) {
        deployed = {'name': 'white sheet',
                    'namespace': 'white sheet',
                    'containerDefinitions': [],
                    'topology': {
                      'containers': {}}};
      }

      sr.getRevision(systemId, revisionId, function(err, target) {
        if (err) { return cb(err); }
        if (target) {
          semCheck = sv.check(target);
          console.log('************************');
          console.log(JSON.stringify(target, null, 2));
          console.log('************************');
          console.log(JSON.stringify(semCheck, null, 2));
          console.log('************************');
          if (semCheck.check) {
            var plan = planner(deployed, target);
            out.plan(plan);
            if (!plan) {
              out.stdout('Unable to plan! -- THIS IS SERIOUS, please report it', 'warn');
              cb(new Error('Unable to plan! -- THIS IS SERIOUS, please report it'));
            }
            else if(plan.length === 0) {
              out.stdout('Nothing to do -- if it should do something, please report it', 'warn');
              cb();
            }
            else {
              deployPlan(deployed, target, plan, mode, out, function(err) {
                if (err) { return cb(err); }
                if (mode !== 'preview') {
                  sr.markDeployedRevision(user, systemId, revisionId, function(err2) {
                    cb(err2);
                  });
                }
                else {
                  cb(err);
                }
              });
            }
          }
          else {
            var errString = '';
            _.each(semCheck.results, function(check) {
              if (!check.result) {
                out.stderr('semver fail: ' + check.container + ' depends ' + check.depends + ' condition ' + check.condition);
                errString += 'semver fail: ' + check.container + ' depends ' + check.depends + ' condition ' + check.condition;
              }
            });
            cb(new Error(errString));
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
    deployPlan: deployPlan
  };
};

