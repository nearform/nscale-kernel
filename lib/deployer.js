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

var _ = require('lodash');
var planner = require('nscale-planner');
var async = require('async');
var sv = require('./semver')();
var sd = require('nscale-util').sysdef();



module.exports = function(config, _containers) {

  var logger = config.logger;


  /**
   * Deploy a plan
   * See https://github.com/nearform/nscale-planner for a plan example.
   *
   * origin - origin system definition
   * target - target system definition
   * plan   - execution plan
   * mode   - preview or live
   * out    - output handles
   * completeCb - completion callback
   */
  var deployPlan = function(origin, target, plan, mode, out, completeCb) {
    var container;
    var containerDef;
    //var tickSize = 100 / plan.length;
    out.initProgress(plan.length, 'deploying');
    var currProgress = 0;
    var prnt;

    function tick(command, c) {
      //currProgress += tickSize;
      currProgress += 1;
      //out.(currProgress, 'progress');
      out.progress(command + ' ' + c.id + ' ' + (c.type || ''));
    }

    logger.info('deploying plan');
    async.eachSeries(plan, function(step, cb) {
      container = target.topology.containers[step.id] || origin.topology.containers[step.id];
      prnt = target.topology.containers[step.parent] || origin.topology.containers[step.parent];
      containerDef = _.find(target.containerDefinitions, function(cdef) {
        return cdef.id === container.containerDefinitionId;
      });
      if (!containerDef) {
        containerDef = _.find(origin.containerDefinitions, function(cdef) {
          return cdef.id === container.containerDefinitionId;
        });
      }
      logger.info('calling: ' + step.cmd);

      // matchup containers to type and apply matching function remove executor
      var err = 'no matching container available for type';
      var impl = _containers[containerDef.type];
      if (!impl) { logger.error(err); return cb(err); }
      tick(step.cmd, container);
      impl[step.cmd](mode, prnt.specific, target, containerDef, container, out, function(err, newTarget, replace){
        //tick();
        if (newTarget) {
          target = newTarget;
          if (replace) {
            _.each(replace, function(repl) {
              plan = sd.replaceId(repl.oldId, repl.newId, plan);
            });
          }
        }
        cb(err);
      });
    }, function(err) {
      completeCb(err, target);
    });
  };



  /**
   * docker specific deploy - hacked only
   */
  var deploy = function(user, systemId, revisionId, deployed, target, sr, mode, out, cb) {
    var semCheck;
    out.stdout('deploying...');
    //out.stdout(0, 'progress');

    if (target) {
      semCheck = sv.check(target);
      if (semCheck.check) {
        logger.info('creating deployment plan');
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
          deployPlan(deployed, target, plan, mode, out, function(err, updatedSystem) {
            if (err) { return cb(err); }
            if (mode !== 'preview') {
              if (updatedSystem.dirty) {
                sr.commitRevision(user, updatedSystem.id, 'identifier change on deploy', updatedSystem, function(err, revisionId) {
                  sr.markDeployedRevision(user, updatedSystem.id, revisionId, function(err2) {
                    cb(err2);
                  });
                });
              }
              else {
                sr.markDeployedRevision(user, systemId, revisionId, function(err2) {
                  cb(err2);
                });
              }
            }
            else {
              cb(err);
            }
          });
        }
      }
      else {
        logger.info('semantic check failed');
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
  };



  var construct = function() {
  };



  construct();
  return {
    deploy: deploy,
    deployPlan: deployPlan
  };
};

