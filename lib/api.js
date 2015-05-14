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
var buildSys = require('./container');

module.exports = function(options, loadConfig, logger, _sr, _containers, _services) {
  var ERR_NOCDEF = 'unable to find container definition';
  var ERR_NOSYSID = 'unable to find system';
  var ERR_NOREV = 'unable to find revision';
  var ERR_NOTARGET = 'unable to find the target environment';

  var _builder;
  var _deployer;
  var _compiler;
  var _synchrotron;
  var _monkey;
  var _monitorInterval;
  var _monitorRunning = false;
  var analyzeAndDeployQueue;
  var analyze = buildAnalyze(loadConfig, logger, _services);



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
  var buildContainer = function(user, identifier, containerIdentifier, revision, target, out, cb) {
    var containerDef;
    var systemId;

    systemId = _sr.findSystem(identifier);
    if (!systemId) {
      logger.error(ERR_NOSYSID); return cb(new Error(ERR_NOSYSID));
    }
    var systemRoot = _sr.repoPath(systemId);
    out.initProgress(9, '--> finding container');

    fetchTarget(systemId, target, revision, function(err, target) {
      if (err) { return cb(err); }
        _builder.loadMatchingTargets(systemId, revision, target, function(err, targets) {
          if (err) { return cb(err); }
          _builder.findContainer(systemId, revision, targets, containerIdentifier, function(err, containerDefId, targets) {
            if (err) { out.stdout(err); logger.error(err); return cb(err); }
            if (!containerDefId) { out.stdout(ERR_NOCDEF); logger.error(ERR_NOCDEF); return cb(ERR_NOCDEF); }
            async.eachSeries(_.values(targets), function(json, cb) {
              var root = buildSys(json);
              containerDef = root.containerDefByDefId(containerDefId);
              json.repoPath = systemRoot;

              if (!containerDef.specific || !containerDef.specific.repositoryUrl) {
                return _builder.build(user, systemId, targets, json, containerDef, target, out, cb);
              }

              _synchrotron.synch(json, containerDef, out, function(err) {
                if (err) { out.stdout(err); logger.error(err); return cb(err); }
                _builder.build(user, systemId, targets, json, containerDef, target, out, cb);
              });
            }, cb);
        });
      });
    });
  };



  /**
   * build all containers belonging to a system, in series
   */
  var buildAllContainers = function(user, systemName, revision, target, out, cb) {
    var systemId = _sr.findSystem(systemName);

    if (!systemId) {
      logger.error(ERR_NOSYSID); return cb(new Error(ERR_NOSYSID));
    }

    logger.info({ systemId: systemId, revision: revision }, 'building all containers');
    fetchTarget(systemId, target, revision, function(err, target) {
      if (err) { return cb(err); }
      _builder.loadMatchingTargets(systemId, revision, target, function(err, targets) {
        if (err) { return cb(err); }

        out.stdout('--> building all containers for ' + targets[Object.keys(targets)[0]].name + ' revision ' + revision + ' target ' + target);

        var containers = _.chain(targets)
          .filter(function(value, key) {
            return target === 'alltargets' || key === target;
          })
          .map(function(target) {
            return _.map(target.containerDefinitions, function(cdef) {
              return {
                id: cdef.id,
                target: target.topology.name,
                type: cdef.type
              };
            });
          })
          .flatten()
          .reduce(function(acc, cont) {
            var notPresent = !_.find(acc, function(found) {
              return found.id === cont.id && found.type === cont.type;
            });

            if (notPresent) {
              acc.push(cont);
            }

            return acc;
          }, [])
          .value();

        async.eachSeries(containers, function (cont, next) {
          buildContainer(user, systemId, cont.id, revision, cont.target, out, function(err) {
            if (err) { out.stderr(err); }
            // so that buildall fails if one build fail
            next(err);
          });
        }, cb);
      });
    });
  };


  /**
   * Supports target abbreviation
   */
  var fetchTarget = function(systemId, target, revision, cb) {
    if (target === 'alltargets') {
      cb(null, target);
    }
    else {
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
    });
    }
  };

  var createAnalyzeAndDeployTask = function (user, systemId, revisionId, target, mode, out, cb) {
    return analyzeAndDeployQueue.push({
      user: user,
      systemId: systemId,
      revisionId: revisionId,
      target: target,
      mode: mode,
      out: out
    }, cb);
  };

  var analyzeAndDeploy = function (user, systemId, revisionId, target, mode, out, cb) {
    analyzeSystem(user, systemId, target, out, function(err, analyzed) {
      if (err) { return cb(err); }

      _sr.getRevision(systemId, revisionId, target, function(err, systemRevision) {
        if (err) { return cb(err); }

        var systemRoot = _sr.repoPath(systemId);
        analyzed.repoPath = systemRoot;
        systemRevision.repoPath = systemRoot;
        systemRevision.topology.name = target;

        _deployer.deploy(user, systemId, revisionId, analyzed, systemRevision, _sr, mode, out, cb);
      });
    });
  };


  var handleAnalyzeAndDeployTask = function (task, cb) {
    logger.info(task, 'starting new deploy');
    analyzeAndDeploy(
      task.user,
      task.systemId,
      task.revisionId,
      task.target,
      task.mode,
      task.out,
      function(err) {
        logger.info(task, 'deploy finished');
        cb(err);
      });
  };


  /**
   * deploy the specified revision to the nominated target
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
          return cb(new Error('revisionId is needed to deploy'));
        }

        return createAnalyzeAndDeployTask(user, systemId, revisionId, target, mode, out, cb);
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
        var systemRoot = _sr.repoPath(systemId);
        system.repoPath = systemRoot;

        analyze(system, function(err, result) {
          logger.info('analysis complete');
          if (err) {
            logger.error(err);
            return cb(err);
          }

          result.repoPath = systemRoot;
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

    getDeployedOrHeadRevisionId(systemId, target, function(err, deployedId) {
      if (err) { return cb(err); }

      createAnalyzeAndDeployTask(user, systemId, deployedId, target, 'preview', out, function (err) {
        cb(err, {plan: out.getPlan(), ops: out.operations()});
      });
    });
  };


  var fixSystem = function(user, identifier, target, out, cb) {
    logger.info('fix system: ' + identifier);
    var systemId = _sr.findSystem(identifier);

    getDeployedOrHeadRevisionId(systemId, target, function(err, revisionId) {
      if (err) {
        return cb(err);
      }
      createAnalyzeAndDeployTask(user, systemId, revisionId, target, 'live', out, cb);
    });
  };



  var removeAllSwContainers = function(system) {
    _.each(system.topology.containers, function(c) {
      if (c.type && (c.type === 'docker' || c.type === 'process')) {
        system.topology.containers[c.containedBy].contains = []; // assuming just sw containers here...
        delete system.topology.containers[c.id];
      }
    });
    return system;
  };



  var stopSystem = function stopSystem(user, identifier, target, out, cb) {
    var systemId = _sr.findSystem(identifier);

    if (!systemId) { logger.error(ERR_NOSYSID); return cb(new Error(ERR_NOSYSID)); }

    analyzeSystem(user, systemId, target, out, function(err, analyzed) {
      if (err) { return cb(err); }
      getDeployedOrHeadRevisionId(systemId, target, function(err, revisionId) {
        if (err) { return cb(err); }
        getDeployedOrHeadSystem(systemId, target, function(err, systemRevision) {
          if (err) { return cb(err); }
          removeAllSwContainers(systemRevision);

          var systemRoot = _sr.repoPath(systemId);
          analyzed.repoPath = systemRoot;
          systemRevision.repoPath = systemRoot;
          systemRevision.topology.name = target;

          removeAllSwContainers(systemRevision);

          _deployer.deploy(user, systemId, revisionId, analyzed, systemRevision, _sr, 'live', out, cb);
        });
      });
    });
  };



  var infoSystem = function(user, identifier, target, out, cb) {
    var result = [];
    analyzeSystem(user, identifier, target, out, function(err, analyzed) {
      if (err) { return cb(err); }
      _.each(analyzed.topology.containers, function(c) {
        var info = '';
        var type = '';
        if (c.type === 'aws-ami') {
          if (c.specific) {
            info = (c.specific.instanceId || '') + ',';
            info += (c.specific.publicIpAddress || '') + ',';
            info += c.specific.privateIpAddress || '';
          }
        }
        if (c.type) {
          type = c.type;
        }
        else {
          var cdef = _.find(analyzed.containerDefinitions, function(cd) { return cd.id === c.containerDefinitionId; });
          if (cdef) {
            type = cdef.type;
          }
        }
        result.push({name: c.id.split('-')[0], type: type, parent: c.containedBy.split('-')[0], info: info});
      });
      cb(err, result);
    });
  };



  /**
   * compile the system into the various targets and commit them to the repository
   */
  var compileSystem = function(user, identifier, comment, out, cb) {
    logger.info('compile system: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    var system;

    if (!systemId) { logger.error(ERR_NOSYSID); return cb(new Error(ERR_NOSYSID)); }

    var repoPath = _sr.repoPath(systemId);
    _compiler.compile(systemId, repoPath, out, function(err, systems) {
      if (err) { return cb(err); }
      async.eachSeries(_.keys(systems), function(key, next) {
          system = systems[key];
          _sr.writeFile(system.id, key + '.json', JSON.stringify(system, null, 2), next);
        },
        function(err) {
          cb(err);
        });
    });
  };



  /**
   * commit the system
   */
  var commitSystem = function(user, identifier, comment, out, cb) {
    logger.info('commit system: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    _sr.commitRevision(user, systemId, comment, function(err, revisionId) {
      cb(err, revisionId);
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
    _synchrotron = require('./synchrotron')(loadConfig);
    _deployer = require('./deployer')(logger, _containers);
    _compiler = require('./compiler')(_synchrotron, loadConfig, logger, options);
    _builder = require('./builder')(logger, _containers, _sr, _compiler);
    _monkey = require('./monkey')(options, 15000, logger);
    analyzeAndDeployQueue = async.queue(handleAnalyzeAndDeployTask, 1);
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
    commitSystem: commitSystem,
    stopSystem: stopSystem,
    infoSystem: infoSystem,

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

