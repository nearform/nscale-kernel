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
module.exports = function(logger, _containers, _sr, _compiler) {



  /**
   * Build the container and update all instantiations of the container 
   * with the new speicific block and replace identifiers for new uuids
   */
  var executeBuild = function build(mode, system, cdef, out, cb) {
    _containers.getHandler(system, cdef.type, function(err, container) {
      if (err) { return cb(err); }
      if (!container) {
        err = new Error('no matching container available for type: ' + cdef.type);
        logger.error(err.message);
        return cb(err);
      }

      if (container.build) {
        out.progress('--> executing container specific build for ' +  cdef.id);
        logger.info({ containerDefinition: cdef.id }, 'executing container specific build');
        container.build(mode, system, cdef, out, function(err, specific) {
          if (err) { logger.error(err); out.stdout(err); return cb(err); }

          out.progress('--> ' + cdef.id + ' built');
          logger.info({ containerDefinition: cdef.id }, 'built');
          cb(err);
        });
      } else {
        out.progress('--> no need to build ' + cdef.id);
        cb(null, {});
      }
    });
  };



  var build = function(user, systemId, targets, json, containerDef, target, out, cb) {
    out.progress('--> initiating container build');
    executeBuild('live', json, containerDef, out, function(err) {
      if (err) { out.stdout(err); logger.error(err); return cb(err); }
      cb();
    });
  };



  /**
   * find the container in the supplied target files, return the container with the highest buildHead number
   */
  var findContainer = function findContainer(systemId, revision, targets, containerIdentifier, cb) {
    var cdefId;
    var types = [];
    async.filter(_.keys(targets), function(key, next) {
      _sr.findContainer(systemId, revision, containerIdentifier, key, function(err, containerDefId, cdef) {
        var def;
        if (!err && containerDefId) {
          cdefId = containerDefId;
          def = _.find(targets[key].containerDefinitions, function(def) {
            return def.id === cdefId;
          });

          if (types.indexOf(def.type) < 0) {
            types.push(def.type);
            return next(true);
          }
        }
        next(false);
      });
    },
    function(keys) {
      var result = keys.reduce(function(acc, key) {
        acc[key] = targets[key];
        return acc;
      }, {});
      cb(null, cdefId, result);
    });
  };

  var loadTargets = function loadTargets(systemId, revision, cb) {
    var result = {};
    var path = _sr.repoPath(systemId);

    // TODO we should list the targets based on revision
    // let's just assume that the targets did non change
    _compiler.listTargets(path, function(err, targets) {
      if (err) { return cb(err); }
      async.eachSeries(targets, function(target, next) {
        _sr.getRevision(systemId, revision, target, function(err, json) {
          if (json) {
            result[target] = json;
          }
          // swallow any errors as a target might not be
          // available in that revision
          // FIXME
          next();
        });
      },
      function(err) {
        if (Object.keys(result).length === 0) {
          return cb(new Error('no available environment for the given revision'));
        }
        cb(err, result);
      });
    });
  };

  var _loadTarget = function _loadTarget(systemId, revision, target, cb) {
    var result = {};
    var path = _sr.repoPath(systemId);

    _sr.getRevision(systemId, revision, target, function(err, json) {
      if (err) { return cb(err); }
        result[target] = json;
        cb(err, result);
    });
  };

  var loadMatchingTargets = function loadMatchingTargets(systemId, revision, target, cb) {
    if (target === 'alltargets') {
      loadTargets(systemId, revision, function(err, result) {
        if (err) { return cb(err); }
        cb(err, result);
      });
    }
    else {
      _loadTarget(systemId, revision, target, function(err, result) {
        if (err) { cb(err); }
        cb(err, result);
      });
    }
  };

  return {
    loadTargets: loadTargets,
    loadMatchingTargets: loadMatchingTargets,
    findContainer: findContainer,
    build: build
  };
};

