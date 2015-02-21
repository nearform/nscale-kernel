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
var sd = require('nscale-util').sysdef();


module.exports = function(config, _containers) {

  var logger = config.logger;


  /**
   * merge in any properties to target that are excelusively only in source
   */
  var merge = function(target, source) {
    var skeys = _.keys(source);
    _.each(skeys, function(skey) {
      if (!target[skey]) {
        target[skey] = source[skey];
      }
    });
    return target;
  };



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
    var c;
    var container;
    var containerDef;
    out.initProgress(plan.length, '--> deploying plan...');
    var currProgress = 0;
    var prnt;

    function tick(command, c) {
      currProgress += 1;
      out.progress(command + ' ' + c.id + ' ' + (c.type || ''));
    }

    logger.info('deploying plan');
    async.eachSeries(plan, function(step, cb) {
      c = target.topology.containers[step.id] || origin.topology.containers[step.id];
      container = _.cloneDeep(c);
      prnt = target.topology.containers[step.parent] || origin.topology.containers[step.parent];
      containerDef = _.find(target.containerDefinitions, function(cdef) {
        return cdef.id === container.containerDefinitionId;
      });
      if (!containerDef) {
        containerDef = _.find(origin.containerDefinitions, function(cdef) {
          return cdef.id === container.containerDefinitionId;
        });
      }
      if (container.specific && origin.topology.containers[step.id] && origin.topology.containers[step.id].specific) {
        container.specific = merge(container.specific, origin.topology.containers[step.id].specific);
      }
      logger.info('calling: ' + step.cmd);

      // matchup containers to type and apply matching function remove executor
      var err = 'no matching container available for type';
      if (containerDef && containerDef.type) {
        var impl = _containers[containerDef.type];
        if (!impl) { logger.error(err); return cb(err); }
        tick(step.cmd, container);
        impl[step.cmd](mode, prnt.specific, target, containerDef, container, out, function(err, newTarget, replace){
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
      }
      else {
        cb();
      }
    }, function(err) {
      completeCb(err, target);
    });
  };



  var mergeSpecificBlock = function(analyzed, target) {
    _.each(target.topology.containers, function(container) {
      var matched = analyzed.topology.containers[container.id];
      if (matched) {
        _.merge(matched.specific, container.specific);
        _.merge(container.specific, matched.specific);
        if (matched.nativeId) {
          container.nativeId = matched.nativeId;
        }
      }
    });
  };



  var mergeImageTags = function(analyzed, target) {
    _.each(target.containerDefinitions, function(cdef) {
      var matched = _.find(analyzed.containerDefinitions, function(anCdef) { return anCdef.id === cdef.id; });
      if (matched) {
        if (cdef.specific && matched.specific && matched.specific.imageTags) {
          cdef.specific.imageTags = matched.specific.imageTags;
        }
      }
    });
  };



  var deploy = function(user, systemId, revisionId, deployed, target, sr, mode, out, cb) {
    out.stdout('--> deploying...');

    if (!target) {
      out.stdout('no target revision - aborting', 'warn');
      cb(new Error('no target revision'));
    }
    mergeSpecificBlock(deployed, target);
    mergeImageTags(deployed, target);

    logger.info('creating deployment plan');
    var plan = planner(deployed, target);
    out.plan(plan);
    if (!plan) {
      out.stdout('Unable to plan! -- THIS IS SERIOUS, please report it', 'warn');
      return cb(new Error('Unable to plan! -- THIS IS SERIOUS, please report it'));
    }
    else if (plan.length === 0) {
      out.stdout('Nothing to do -- if it should do something, please report it', 'warn');
      return cb();
    }

    async.map(target.containerDefinitions, function(def, cb) {
      var plugin = _containers[def.type];

      if (!plugin || !plugin.needsBuild) {
        return cb();
      }

      plugin.needsBuild(mode, target, def, out, cb);
    }, function(err, list) {
      if (err) { return cb(err); }

      list = list.filter(function(def) { return def; });

      if (list.length > 0) {
        out.stdout('The following images needs building:');
        list.forEach(function(def) {
          out.stdout(def.id);
        });
        return cb(new Error('build needed: launch nscale container buildall'));
      }

      deployPlan(deployed, target, plan, mode, out, function(err, updatedSystem) {
        if (mode !== 'preview') {
          if (updatedSystem.dirty) {
            updatedSystem.dirty = false;
            sr.markDeployedRevision(user, updatedSystem.id, revisionId, target.topology.name, function(err2) {
              cb(err || err2);
            });
          }
          else {
            sr.markDeployedRevision(user, systemId, revisionId, target.topology.name, function(err2) {
              cb(err || err2);
            });
          }
        }
        else {
          cb(err);
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

