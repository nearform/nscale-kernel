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
var uuid = require('uuid');
var async = require('async');



/**
 * container builder
 */
module.exports = function(config, _containers, _sr, _compiler) {

  var logger = config.logger;

  var updateTopology = function(json, containerDef, container) {
    var prnt = json.topology.containers[container.containedBy];
    var newId = uuid.v4();
    var oldId = container.id;
    var idx;

    if (!prnt) {
      // Root container, bail out.
      return;
    }

    if (-1 !== (idx = prnt.contains.indexOf(oldId))) {
      prnt.contains[idx] = newId;
    }
    json.topology.containers[oldId].id = newId;

    json.topology.containers[newId] = json.topology.containers[oldId];
    delete json.topology.containers[oldId];
  };



  /**
   * Build the container and update all instantiations of the container 
   * with the new speicific block and replace identifiers for new uuids
   */
  var executeBuild = function build(mode, system, cdef, out, cb) {
    var err = 'no matching container available for type: ' + cdef.type;
    var container = _containers[cdef.type];

    if (!container) { logger.error(err); return cb(err); }

    if (container.build) {
      out.progress('--> executing container specific build for ' +  cdef.id);
      logger.info({ containerDefinition: cdef.id }, 'executing container specific build');
      container.build(mode, system, cdef, out, function(err, specific) {
        if (err) { logger.error(err); out.stdout(err); return cb(err); }

        out.progress('--> ' + cdef.id + ' built, updating topology');
        logger.info({ containerDefinition: cdef.id }, 'updating topology');

        var matches = _.filter(system.topology.containers, function(c) {
          return c.containerDefinitionId === cdef.id;
        });
        _.each(matches, function(ctnr) {
          ctnr.specific = specific;
          updateTopology(system, cdef, ctnr);
        });

        if (cdef.specific.buildHead) {
          cdef.specific.buildHead = cdef.specific.buildHead + 1;
        }
        cb(err, specific);
      });
    } else {
      out.progress('--> no need to build this container');
      cb(null, {});
    }
  };



  var frigTargetsPostBuild = function(targets, containerDef, target) {
    var newTopology;
    var key;
    var sk;
    var containedBy;
    var parentContainer;

    key = _.find(_.keys(targets[target].topology.containers), function(k) {
      return targets[target].topology.containers[k].containerDefinitionId === containerDef.id;
    });
    newTopology = targets[target].topology.containers[key];

    _.each(_.keys(targets), function(k) {
      if (k !== target) {
        _.remove(targets[k].containerDefinitions, function(cdef) { return cdef.id === containerDef.id; });
        targets[k].containerDefinitions.push(_.cloneDeep(containerDef));

        sk = _.find(_.keys(targets[k].topology.containers), function(ki) {
          return targets[k].topology.containers[ki].containerDefinitionId === containerDef.id;
        });

        if (sk) {
          containedBy = targets[k].topology.containers[sk].containedBy;
          parentContainer = targets[k].topology.containers[containedBy];
          _.remove(parentContainer.contains, function(c) { return c === sk; });
          parentContainer.contains.push(newTopology.id);
          delete targets[k].topology.containers[sk];
          targets[k].topology.containers[newTopology.id] = _.cloneDeep(newTopology);
          targets[k].topology.containers[newTopology.id].containedBy = containedBy;
        }
      }
    });
  };



  var writeTargets = function(systemId, targets, cb) {
    async.eachSeries(_.keys(targets), function(key, next) {
      _sr.writeFile(systemId, key + '.json', JSON.stringify(targets[key], null, 2), function(err) {
        next(err);
      });
    },
    function(err) { cb(err); });
  };



  /**
   * find the container in the supplied target files, return the container with the highest buildHead number
   */
  var findContainer = function findContainer(systemId, targets, containerIdentifier, cb) {
    var cdefId;
    var target;
    var buildHeadMax = 1;

    async.eachSeries(_.keys(targets), function(key, next) {
      _sr.findContainer(systemId, containerIdentifier, key, function(err, containerDefId, cdef) {
        if (!err && containerDefId) {

          if (!cdefId) {
            cdefId = containerDefId;
            target = key;
            if (cdef && cdef.specific && cdef.specific.buildHead) {
              buildHeadMax = cdef.specific.buildHead;
            }
          }

          if (cdef && cdef.specific && cdef.specific.buildHead && buildHeadMax < cdef.specific.buildHead) {
            cdefId = containerDefId;
            target = key;
            if (cdef && cdef.specific && cdef.specific) {
              buildHeadMax = cdef.specific.buildHead;
            }
          }
        }
        next();
      });
    },
    function() {
      cb(null, cdefId, target);
    });
  };



  var loadTargets = function loadTargets(systemId, cb) {
    var result = {};
    var path = _sr.repoPath(systemId);

    _compiler.listTargets(path, function(err, targets) {
      async.eachSeries(targets, function(target, next) {
        _sr.getHead(systemId, target, function(err, json) {
          result[target] = json;
          next(err);
        });
      },
      function() {
        cb(err, result);
      });
    });
  };



  var build = function(user, systemId, targets, json, containerDef, target, out, cb) {
    out.progress('--> initiating container build');
    executeBuild('live', json, containerDef, out, function(err) {
      if (err) { out.stdout(err); logger.error(err); return cb(err); }
      out.progress('updating timeline');
      _sr.writeTimeline(user, systemId, 'build', 'built container: ' + containerDef.id);

      frigTargetsPostBuild(targets, containerDef, target);
      writeTargets(systemId, targets,  function(err) {
        if (err) { return cb(err); }
        _sr.commitRevision(user, systemId, 'built container: ' + containerDef.id, function(err) {
          out.progress('comitting revision');
          return cb(err);
        });
      });
    });
  };



  return {
    loadTargets: loadTargets,
    findContainer: findContainer,
    build: build
  };
};

