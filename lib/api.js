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

var async = require('async');
var buildAnalyze = require('./analyze');
var _ = require('lodash');

module.exports = function(options, _sr, _containers) {
  var ERR_NOCDEF = 'unable to find container definition';
  var ERR_NOSYSID = 'unable to find system';
  var ERR_NOREV = 'unable to find revision';
  var ERR_NOTARGET = 'unable to find the target environment';

  var _sys;
  var _builder;
  var _deployer;
  var _compiler;
  var _synchrotron;
  var _monkey;
  var _monitorInterval;
  var _monitorRunning = false;
  var logger = options.logger;
  var analyze = buildAnalyze(options, logger);



  /**
   * list all of the available systems
   */
  var listSystems = function(cb) {
    logger.info('list systems');
    var systems = _sr.listSystems();
    cb(null, systems);
  };



  /**
   * get the full head system definition (latest revision)
   */
  var getHeadSystem = function(identifier, target, cb) {
    logger.info('get head system: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    if (!systemId) { logger.error(ERR_NOSYSID); return cb(new Error(ERR_NOSYSID)); }
    _sr.getHead(systemId, target, cb);
  };



  /**
   * get the full deployed system definition
   */
  var getDeployedSystem = function(identifier, target, cb) {
    var systemId = _sr.findSystem(identifier);
    if (!systemId) { logger.error(ERR_NOSYSID); return cb(new Error(ERR_NOSYSID)); }
    fetchTarget(systemId, target, function(err, target) {
      if (err) { return cb(err); }
      logger.info({ systemId: systemId, target: target }, 'get deployed system');
      _sr.getDeployedRevision(systemId, target, cb);
    });
  };



  /**
   * create a new  blank system
   */
  var createSystem = function(user, name, namespace, cwd, cb) {
    logger.info('create system name: ' + name + ', namespace: ' + namespace + ', cwd: ' + cwd);
    _sr.createSystem(user, namespace, name, cwd, cb);
  };




  /**
   * link a system from local fs
   */
  var linkSystem = function(user, path, cwd, cb) {
    logger.info('link system: ' + path + ', ' + cwd);
    _sr.linkSystem(user, path, cwd, cb);
  };



  /*
   * unlink a system from local fs
   */
  var unlinkSystem = function(user, identifier, cb) {
    var systemId = _sr.findSystem(identifier);
    if (!systemId) { return cb(new Error(ERR_NOSYSID)); }
    logger.info('unlink system: ' + systemId);
    _sr.unlinkSystem(user, systemId, cb);
  };





  /**
   * list all of the available containers in a system
   */
  var listContainers = function(identifier, revisionId, out, cb) {
    logger.info('list containers: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    var containers = {};
    if (!systemId) { return cb(new Error(ERR_NOSYSID)); }
    _builder.loadTargets(systemId, revisionId, function(err, targets) {
      if (err) { return cb(err); }
      _.each(targets, function(target) {
        _.each(target.containerDefinitions, function(cdef) {
          containers[cdef.id] = cdef;
        });
      });
      cb(null, _.values(containers));
    });
  };




  /**
   * build a container
   */
  var buildContainer = function(user, identifier, containerIdentifier, revision, out, cb) {
    var json;
    var root;
    var containerDef;
    var systemId;

    systemId = _sr.findSystem(identifier);
    if (!systemId) {
      logger.error(ERR_NOSYSID); return cb(new Error(ERR_NOSYSID));
    }

    var systemRoot = _sr.repoPath(systemId);
    out.initProgress(9, '--> finding container');

    _builder.loadTargets(systemId, revision, function(err, targets) {
      if (err) { return cb(err); }

      _builder.findContainer(systemId, targets, containerIdentifier, function(err, containerDefId, target) {
        if (err) { out.stdout(err); logger.error(err); return cb(err); }
        if (!containerDefId) { out.stdout(ERR_NOCDEF); logger.error(ERR_NOCDEF); return cb(ERR_NOCDEF); }

        json = targets[target];
        root = _sys(options);
        root.load(json);
        containerDef = root.containerDefByDefId(containerDefId);
        json.repoPath = systemRoot;

        if (!containerDef.specific || !containerDef.specific.repositoryUrl) {
          return _builder.build(user, systemId, targets, json, containerDef, target, out, cb);
        }

        _synchrotron.synch(json, containerDef, out, function(err) {
          if (err) { out.stdout(err); logger.error(err); return cb(err); }
          _builder.build(user, systemId, targets, json, containerDef, target, out, cb);
        });
      });
    });
  };



  /**
   * build all containers belonging to a system, in series
   */
  var buildAllContainers = function(user, systemName, revision, out, cb) {
    var containers = [];
    var systemId = _sr.findSystem(systemName);

    if (!systemId) {
      logger.error(ERR_NOSYSID); return cb(new Error(ERR_NOSYSID));
    }

    logger.info({ systemId: systemId, revision: revision }, 'building all containers');
    out.stdout('--> building all containers for ' + systemName + ' revision ' + revision);

    _builder.loadTargets(systemId, revision, function(err, targets) {
      if (err) { return cb(err); }

      _.each(targets, function(target) {
        _.each(target.containerDefinitions, function(cdef) {
          if (!_.find(containers, function(id) { return id === cdef.id; })) {
            containers.push(cdef.id);
          }
        });
      });

      async.eachSeries(containers, function (containerId, next) {
        buildContainer(user, systemId, containerId, revision, out, function(err) {
          if (err) { out.stderr(err); }
          next();
        });
      }, cb);
    });
  };


  /**
   * Supports target abbreviation
   */
  var fetchTarget = function(systemId, target, revision, cb) {

    if (typeof revision === 'function') {
      cb = revision;
      revision = 'latest';
    }

    _builder.loadTargets(systemId, revision, function(err, targets) {
      if (err) { return cb(err); }

      var candidates = Object.keys(targets).filter(function(candidate) {
        return candidate.indexOf(target) >= 0;
      });

      if (candidates.length === 0 || candidates.length > 1) {
        logger.error(ERR_NOTARGET);
        return cb(new Error(ERR_NOTARGET));
      } else {
        target = candidates[0];
      }

      cb(null, target);
    })
  };

  /**
   * deploy the current or specified revision to the nominated target
   *
   * handle if file is missing
   *
   */
  var deployRevision = function(user, identifier, revisionIdentifier, target, mode, out, cb) {
    var systemId = _sr.findSystem(identifier);

    if (!systemId) { logger.error(ERR_NOSYSID); return cb(new Error(ERR_NOSYSID)); }

    fetchTarget(systemId, target, function(err, target) {
      if (err) { return cb(err); }

      _sr.findRevision(systemId, revisionIdentifier, function(err, revisionId) {
        if (err) { out.stdout(ERR_NOREV); logger.error(ERR_NOREV); return cb(ERR_NOREV); }

        logger.info({
          systemId: systemId,
          revisionId: revisionId,
          environment: target
        }, 'deploy revision');

        if (!mode) { mode = 'live'; }
        if (!revisionId) {
          _sr.getHeadRevisionId(systemId, function(err, headId) {
            _sr.getHead(systemId, target, function(err, head) {
              if (err) { return cb(err); }
              analyzeSystem(user, identifier, target, out, function(err, analyzed) {
                if (err) { return cb(err); }

                var systemRoot = _sr.repoPath(systemId);
                analyzed.repoPath = systemRoot;
                head.repoPath = systemRoot;
                head.topology.name = target;

                _deployer.deploy(user, systemId, headId, analyzed, head, _sr, mode, out, function(err, result) {
                  cb(err, result);
                });
              });
            });
          });
        }
        else {
          _sr.getRevision(systemId, revisionId, target, function(err, revision) {
            analyzeSystem(user, identifier, target, out, function(err, analyzed) {
              if (err) { return cb(err); }

              var systemRoot = _sr.repoPath(systemId);
              analyzed.repoPath = systemRoot;
              revision.repoPath = systemRoot;

              revision.topology.name = target;

              _deployer.deploy(user, systemId, revisionId, analyzed, revision, _sr, mode, out, function(err, result) {
                cb(err, result);
              });
            });
          });
        }
      });
    });
  };



  /**
   * preview a system deploy
   */
  var previewRevision = function(user, identifier, revisionIdentifier, target, out, cb) {
    logger.info('preview revision: ' + identifier + ', ' + revisionIdentifier + ' ' + target);
    deployRevision(user, identifier, revisionIdentifier, target, 'preview', out, function(err) {
      cb(err, {plan: out.getPlan(), ops: out.operations()});
    });
  };



  /**
   * get the revision history for a system
   */
  var listRevisions = function(identifier, cb) {
    logger.info('list revisions: ' + identifier);
    if (!identifier) {
      return cb(new Error('no identifier'));
    }
    var systemId = _sr.findSystem(identifier);

    if (!systemId) {
      return cb(new Error('system not found'));
    }

    _sr.listRevisions(systemId, function(err, revisions) {
      cb(err, _.first(revisions, 20));
      //cb(err, revisions);
    });
  };



  /**
   * get a specific revision
   */
  var getRevision = function(identifier, revisionIdentifier, target, cb) {
    logger.info('get revision: ' + identifier + ', ' + revisionIdentifier);
    var systemId = _sr.findSystem(identifier);
    if (!systemId) { logger.error(ERR_NOSYSID); return cb(new Error(ERR_NOSYSID)); }
    fetchTarget(systemId, target, revisionIdentifier, function(err, target) {
      if (err) { return cb(err); }
      _sr.findRevision(systemId, revisionIdentifier, function(err, revisionId) {
        if (err) { return cb(err); }
        _sr.getRevision(systemId, revisionId, target, cb);
      });
    });
  };



  var markRevision = function(user, identifier, revisionIdentifier, cb) {
    logger.info('mark revision: ' + identifier + ', ' + revisionIdentifier);
    var systemId = _sr.findSystem(identifier);
    _sr.findRevision(systemId, revisionIdentifier, function(err, revisionId) {
      _sr.markDeployedRevision(user, systemId, revisionId, cb);
    });
  };



  /**
   * get timeline
   */
  var timeline = function(identifier, cb) {
    var systemId = _sr.findSystem(identifier);
    if (!systemId) {
      logger.error(ERR_NOSYSID); return cb(new Error(ERR_NOSYSID));
    }

    _sr.getTimeline(systemId, function(err, timeline) {
      cb(err, { entries: timeline });
    });
  };



  var getDeployedOrHeadSystem = function(systemId, target, cb) {
    getDeployedSystem(systemId, target, function(err, system) {
      if (!system) {
        getHeadSystem(systemId, target, function(err, head) {
          cb(err, head);
        });
      }
      else {
        cb(err, system);
      }
    });
  };


  var analyzeSystem = function(user, identifier, target, out, cb) {
    logger.info({ system: identifier }, 'analyze system');
    var systemId = _sr.findSystem(identifier);

    fetchTarget(systemId, target, function(err, target) {
      if (err) { return cb(err); }
      getDeployedOrHeadSystem(systemId, target, function(err, system) {
        if (err) { return cb(err); }
        logger.info('running analysis against deployed system');
        analyze(system, function(err, result) {
          logger.info('analysis complete');
          if (err) {
            logger.error(err);
          }
          cb(err, result, system);
        });
      });
    });
  };



  var getDeployedOrHeadRevisionId = function(systemId, target, cb) {
    _sr.getDeployedRevisionId(systemId, target, function(err, revId) {
      if (!revId) {
        _sr.getHeadRevisionId(systemId, function(err, headId) {
          cb(err, headId);
        });
      }
      else {
        cb(err, revId);
      }
    });
  };



  var checkSystem = function(user, identifier, target, out, cb) {
    logger.info('check system: ' + identifier);
    var systemId = _sr.findSystem(identifier);

    if (!systemId) { logger.error(ERR_NOSYSID); return cb(new Error(ERR_NOSYSID)); }

    analyzeSystem(user, systemId, target, out, function(err, analyzed, system) {
      if (err) { return cb(err); }
      getDeployedOrHeadRevisionId(systemId, target, function(err, deployedId) {
        if (err) { return cb(err); }

        var systemRoot = _sr.repoPath(systemId);
        analyzed.repoPath = systemRoot;
        system.repoPath = systemRoot;

        _deployer.deploy(user, systemId, deployedId, analyzed, system, _sr, 'preview', out, function(err/*, result*/) {
          cb(err, {plan: out.getPlan(), ops: out.operations()});
        });
      });
    });
  };



  var fixSystem = function(user, identifier, target, out, cb) {
    logger.info('fix system: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    analyzeSystem(user, systemId, target, out, function(err, analyzed, system) {
      if (err) { return cb(err); }

      getDeployedOrHeadRevisionId(systemId, target, function(err, deployedId) {

        var systemRoot = _sr.repoPath(systemId);
        analyzed.repoPath = systemRoot;
        system.repoPath = systemRoot;

        _deployer.deploy(user, systemId, deployedId, analyzed, system, _sr, 'live', out, function(err, result) {
          cb(err, result);
        });
      });
    });
  };



  /**
   * compile the system into the various targets and commit them to the repository
   */
  var compileSystem = function(user, identifier, out, cb) {
    logger.info('compile system: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    var system;

    if (!systemId) { logger.error(ERR_NOSYSID); return cb(new Error(ERR_NOSYSID)); }

    var repoPath = _sr.repoPath(systemId);

    _compiler.compile(getHeadSystem, systemId, repoPath, out, function(err, systems) {
      if (err) { return cb(err); }
      async.eachSeries(_.keys(systems), function(key, next) {
          system = systems[key];
          _sr.writeFile(system.id, key + '.json', JSON.stringify(system, null, 2), next);
        },
        function(err) {
          if (err) { return cb(err); }
          _sr.commitRevision(user, system.id, 'system compile', function(err, revisionId) {
            if (err) { return cb(err); }
            cb(null, revisionId);
          });
        });
    });
  };



  var monkeyStart = function(user, identifier, target, out, cb) {
    _monkey.start(function() { return _monitorRunning; }, analyzeSystem, user, identifier, target, out, function() {
      cb(null);
    });
  };



  var monkeyStop = function(user, identifier, target, out, cb) {
    _monkey.stop(function() {
      cb(null);
    });
  };



  var monitorStart = function(user, identifier, target, out, cb) {
    if (_monitorInterval) { return cb(); }

    _monitorInterval = setInterval(function() {
      if (_monkey.spanking()) {
        logger.info('check aborted monkey is spanking');
        return;
      }
      _monitorRunning = true;
      checkSystem(user, identifier, target, out, function(err, result) {
        if (err) {
          logger.error('error during system monitor: ' + err);
        }
        else {
          if (result.plan.length > 0) {
            logger.warn('deviation detected applying remedial fixes');
            fixSystem(user, identifier, target, out, function(err) {
              _monitorRunning = false;
              if (err) {
                logger.error('error applying remedial fixes: ' + err);
              }
              else {
                logger.info('remedial fixes applied');
              }
            });
          }
          else {
            _monitorRunning = false;
          }
        }
      });
    }, 10000);
    cb(null, 'monitor started');
    logger.info('monitor started');
  };



  var monitorStop = function (user, identifier, target, out, cb) {
    if (_monitorInterval) {
      clearInterval(_monitorInterval);
      _monitorInterval = undefined;
    }
    cb();
  };



  var construct = function() {
    _sys = require('./container');
    _synchrotron = require('./synchrotron')(options);
    _deployer = require('./deployer')(options, _containers);
    _compiler = require('./compiler')(_synchrotron, logger);
    _builder = require('./builder')(options, _containers, _sr, _compiler);
    _monkey = require('./monkey')(options, 15000, logger);
  };



  construct();
  return {
    listSystems: listSystems,
    createSystem: createSystem,
    getDeployedSystem: getDeployedSystem,
    linkSystem: linkSystem,
    unlinkSystem: unlinkSystem,
    fixSystem: fixSystem,
    compileSystem: compileSystem,

    listContainers: listContainers,
    buildContainer: buildContainer,
    buildAllContainers: buildAllContainers,
    deployRevision: deployRevision,
    previewRevision : previewRevision,

    listRevisions: listRevisions,
    getRevision: getRevision,
    markRevision: markRevision,

    timeline: timeline,

    analyzeSystem: analyzeSystem,
    checkSystem: checkSystem,

    monkeyStart: monkeyStart,
    monkeyStop: monkeyStop,
    monitorStart: monitorStart,
    monitorStop: monitorStop
  };
};

