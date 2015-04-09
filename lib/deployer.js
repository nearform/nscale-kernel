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


module.exports = function(logger, _containers) {



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
        _containers.getHandler(target, containerDef.type, function(err, impl) {
          if (err) { return cb(err); }
          if (!impl) { logger.error(err); return cb(new Error(err)); }
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


  var getAutoscalingGroups = function(sys) {
    return _.filter(sys.topology.containers, function(cont) {
      return cont.type === 'aws-autoscaling';
    });
  };

  var fixAutoscaling = function(analyzed, target) {
    var analyzedGroups = getAutoscalingGroups(analyzed);
    var targetGroups = getAutoscalingGroups(target);

    if (analyzedGroups.length === 0 && targetGroups.length === 0) {
      // nothing to do
      return false;
    }

    // check if there is only one machine target machine for each
    // autoscaling group
    var isOk = _.every(targetGroups, function(auto) {
      return auto.contains.length === 1;
    });

    if (!isOk) {
      return 'there are autoscaling group with more than one children in the definition';
    }

    _.each(analyzedGroups, function(group) {
      var targetGroup = target.topology.containers[group.id];
      if (!targetGroup) {
        // nothing to do
        return;
      }

      // we have already verified that the group has 1 children
      var blueprint = target.topology.containers[targetGroup.contains[0]];
      delete target.topology.containers[blueprint.id];

      // override it with the same number of entries we got from
      // the analyzer, so that the planner does its magic
      targetGroup.contains = _.chain(group.contains).map(function(id) {
        // create a single machine for each of the contained thing
        var targetMac = _.cloneDeep(blueprint);
        targetMac.id = id;
        return targetMac;
      }).each(function(mac) {
        target.topology.containers[mac.id] = mac;
      }).each(function(mac) {
        var parentId = analyzed.topology.containers[mac.id].nativeId.replace('i-', '');
        generateChildrenInTarget(mac, blueprint, parentId);
      }).pluck('id').value();

      _.forEach(blueprint.contains, function(child) {
        delete target.topology.containers[child];
      });
    });

    console.log(JSON.stringify(target, null, 2));

    // no error
    return false;

    function generateChildrenInTarget(parent, blueprint, parentId) {
      var newContains = _.chain(blueprint.contains).map(function(cont) {
        cont = target.topology.containers[cont];
        // creates custom ids based on the blueprint
        var newCont = _.cloneDeep(cont);
        var splitted = newCont.id.split('$');
        newCont.id = splitted[0] + '-' + parentId + '$' + splitted[1];
        newCont.containedBy = parent.id;
        return newCont;
      }).forEach(function(cont) {
        // adds the container to the original target
        target.topology.containers[cont.id] = cont;
      }).map(function(cont) {
        return cont.id;
      }).value();

      parent.contains = newContains;
    }
  };



  var deploy = function(user, systemId, revisionId, deployed, target, sr, mode, out, cb) {
    out.stdout('--> deploying...');

    if (!target) {
      out.stdout('no target revision - aborting', 'warn');
      cb(new Error('no target revision'));
    }
    var autoError = fixAutoscaling(deployed, target);
    if (autoError) {
      return cb(new Error(autoError));
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
      _containers.getHandler(target, def.type, function(err, plugin) {
        if (!plugin || !plugin.needsBuild) {
          return cb();
        }

        plugin.needsBuild(mode, target, def, out, cb);
      });
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
        if (err) {
          logger.warn(err, 'plan not deployed');
          return cb(err);
        }
        logger.info('plan deployed');

        if (mode !== 'preview') {
          updatedSystem.dirty = false;
          sr.markDeployedRevision(user, updatedSystem.id, revisionId, target.topology.name, cb);
        }
        else {
          cb();
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

