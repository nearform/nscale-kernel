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

module.exports = function(options, _sr, _analyzer, _containers) {
  var ERR_NOCDEF = 'unable to find container definition';
  var ERR_NOSYSID = 'unable to find system';
  var ERR_NOREV = 'unable to find revision';

  var _sys;
  var _builder;
  var _deployer;
  var _compiler;
  var _synchrotron;
  var logger = options.logger;



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
  var getHeadSystem = function(identifier, cb) {
    logger.info('get head system: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    _sr.getHead(systemId, cb);
  };



  /**
   * get the full deployed system definition
   */
  var getDeployedSystem = function(identifier, cb) {
    logger.info('get deployed system: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    _sr.getDeployedRevision(systemId, cb);
  };



  /**
   * create a new  blank system
   */
  var createSystem = function(user, name, namespace, cwd, cb) {
    logger.info('create system name: ' + name + ', namespace: ' + namespace + ', cwd: ' + cwd);
    _sr.createSystem(user, namespace, name, cwd, cb);
  };



  /**
   * put the system definition, if the system doesn't exist it will be created
   */
  var putSystem = function(user, system, cb) {
    var doc = JSON.parse(system);
    logger.info('put system: ' + system.name);

    if (!_sr.systemExists(doc.namespace, doc.name)) {
      _sr.createSystem(user, doc.namespace, doc.name, function(err, repoId) {
        if (err) { return cb(err); }
        doc.id = repoId;
        _sr.commitRevision(user, doc.id, 'no comment', doc, function(err, revisionId) {
          _sr.markDeployedRevision(user, doc.id, revisionId, cb);
        });
      });
    }
    else {
      _sr.commitRevision(user, doc.id, 'no comment', doc, cb);
    }
  };



  /**
   * clone a system from github
   */
  var cloneSystem = function(user, url, cwd, cb) {
    logger.info('clone system: ' + url + ', ' + cwd);
    _sr.cloneSystem(user, url, cwd, cb);
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
   * pull/push system and sync with remote
   */
  var syncSystem = function(user, identifier, cb) {
    logger.info('sync system: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    _sr.syncSystem(user, systemId, cb);
  };



  /**
   * add a remote url to the system repository
   */
  var addRemote = function(user, identifier, url, cb) {
    logger.info('add remote: ' + identifier + ', ' + url);
    var systemId = _sr.findSystem(identifier);
    _sr.addRemote(user, systemId, url, cb);
  };



  /**
   * list all of the available containers in a system
   */
  var listContainers = function(identifier, cb) {
    logger.info('list containers: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    _sr.getHead(systemId, function(err, json) {
      if (err) { return cb(err); }
      cb(err, json.containerDefinitions);
    });
  };



  /**
   * add a new container to the system
   */
  var addContainer = function(user, identifier, container, cb) {
    logger.info('add container: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    var cont = JSON.parse(container);
    _sr.addContainer(user, systemId, cont, cb);
  };



  /**
   * update the container
   */
  var putContainer = function(user, identifier, container, cb) {
    logger.info('put container: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    var cont = JSON.parse(container);
    _sr.putContainer(user, systemId, cont, cb);
  };



  /**
   * delete the container
   */
  var deleteContainer = function(user, identifier, containerIdentifier, cb) {
    logger.info('delete container: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    _sr.deleteContainer(user, systemId, containerIdentifier, cb);
  };



  /**
   * build a container
   */
  var buildContainer = function(user, identifier, containerIdentifier, out, cb) {
    var doBuild = function(json, containerDef, out, cb) {
      out.progress('--> initiating container build');
      _builder.build('live', json, containerDef, out, function(err, specific) {
        if (err) { out.stdout(err); logger.error(err); return cb(err); }
        out.progress('updating timeline');
        _sr.writeTimeline(user, systemId, 'build', 'built container: ' + containerDef.id);
        _sr.commitRevision(user, systemId, 'built container: ' + containerDef.id, json, function(err) {
          out.progress('comitting revision');
          return cb(err);
        });
      });
    };

    logger.info({
      identifier: identifier,
      container: containerIdentifier
    }, 'container build requested');

    var systemId = _sr.findSystem(identifier);
    var systemRoot = _sr.repoPath(systemId);

    out.initProgress(9, '--> finding container');

    if (!systemId) { out.stdout(ERR_NOSYSID); logger.error(ERR_NOSYSID); return cb(ERR_NOSYSID); }

    _sr.findContainer(systemId, containerIdentifier, function(err, containerDefId) {
      if (err) { out.stdout(err); logger.error(err); return cb(err); }
      if (!containerDefId) { out.stdout(ERR_NOCDEF); logger.error(ERR_NOCDEF); return cb(ERR_NOCDEF); }
      _sr.getHead(systemId, function(err, json) {
        if (err) { out.stderr(err); logger.error(err); return cb(err); }
        var root = _sys(options);

        root.load(json);
        var containerDef = root.containerDefByDefId(containerDefId);

        // fix needed to pass through the system root
        // and build the docker containers from the folder.
        json.repoPath = systemRoot;

        if (!containerDef.specific || !containerDef.specific.repositoryUrl) {
          return doBuild(json, containerDef, out, cb);
        }

        _synchrotron.synch(json, containerDef, out, function(err) {
          if (err) { out.stdout(err); logger.error(err); return cb(err); }
          doBuild(json, containerDef, out, cb);
        });
      });
    });
  };



  /**
   * build all containers belong to a system, in series
   */
  var buildAllContainers = function(user, systemName, out, cb) {
    logger.info('building all containers for ' + systemName);
    out.stdout('--> building all containers for ' + systemName + '...');

    var systemId = _sr.findSystem(systemName);
    _sr.getHead(systemId, function(err, json) {
      if (err) { return cb(err); }

      async.eachSeries(json.containerDefinitions, function (container, next) {
        buildContainer(user, systemId, container.name, out, function(err) {
          if (err) { out.stderr(err); }
          next();
        });
      }, cb);
    });
  };



  /**
   * deploy the current or specified revision
   */
  var deployRevision = function(user, identifier, revisionIdentifier, mode, out, cb) {
    logger.info('deploy revision: ' + identifier + ', ' + revisionIdentifier);
    var systemId = _sr.findSystem(identifier);

    if (!systemId) { out.stdout(ERR_NOSYSID); logger.error(ERR_NOSYSID); return cb(ERR_NOSYSID); }
    _sr.findRevision(systemId, revisionIdentifier, function(err, revisionId) {
      if (err) { out.stdout(ERR_NOREV); logger.error(ERR_NOREV); return cb(ERR_NOREV); }

      if (!mode) { mode = 'live'; }
      if (!revisionId) {
        _sr.getHeadRevisionId(systemId, function(err, headId) {
          _sr.getHeadRevision(systemId, function(err, head) {
            analyzeSystem(user, identifier, out, function(err, analyzed) {
              if (err) { return cb(err); }

              var systemRoot = _sr.repoPath(systemId);
              analyzed.repoPath = systemRoot;
              head.repoPath = systemRoot;

              _deployer.deploy(user, systemId, headId, analyzed, head, _sr, mode, out, function(err, result) {
                cb(err, result);
              });
            });
          });
        });
      }
      else {
        _sr.getRevision(systemId, revisionId, function(err, target) {
          analyzeSystem(user, identifier, out, function(err, analyzed) {
            if (err) { return cb(err); }

            var systemRoot = _sr.repoPath(systemId);
            analyzed.repoPath = systemRoot;
            target.repoPath = systemRoot;

            _deployer.deploy(user, systemId, revisionId, analyzed, target, _sr, mode, out, function(err, result) {
              cb(err, result);
            });
          });
        });
      }
    });
  };



  /**
   * preview a system deploy
   */
  var previewRevision = function(user, identifier, revisionIdentifier, out, cb) {
    logger.info('preview revision: ' + identifier + ', ' + revisionIdentifier);
    deployRevision(user, identifier, revisionIdentifier, 'preview', out, function(err) {
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
      cb(err, revisions);
    });
  };



  /**
   * get a specific revision
   */
  var getRevision = function(identifier, revisionIdentifier, cb) {
    logger.info('get revision: ' + identifier + ', ' + revisionIdentifier);
    var systemId = _sr.findSystem(identifier);
    _sr.findRevision(systemId, revisionIdentifier, function(err, revisionId) {
      _sr.getRevision(systemId, revisionId, cb);
    });
  };



  var markRevision = function(user, identifier, revisionIdentifier, cb) {
    logger.info('mark revision: ' + identifier + ', ' + revisionIdentifier);
    var systemId = _sr.findSystem(identifier);
    _sr.findRevision(systemId, revisionIdentifier, function(err, revisionId) {
      _sr.markDeployedRevisionNoCommit(user, systemId, revisionId, cb);
    });
  };



  /**
   * get timeline
   */
  // TODO: update this to read git commit log
  var timeline = function(identifier, cb) {
    var systemId = _sr.findSystem(identifier);
    _sr.getTimeline(systemId, function(err, timeline) {
      cb(err, timeline);
    });
  };



  var getDeployedOrHeadSystem = function(systemId, cb) {
    getDeployedSystem(systemId, function(err, system) {
      if (!system) {
        getHeadSystem(systemId, function(err, head) {
          cb(err, head);
        });
      }
      else {
        cb(err, system);
      }
    });
  };



  var analyzeSystem = function(user, identifier, out, cb) {
    logger.info({ system: identifier }, 'analyze system');
    var systemId = _sr.findSystem(identifier);

    getDeployedOrHeadSystem(systemId, function(err, system) {
      logger.info('running analysis against deployed system');
      _analyzer.analyze(options.modules.analysis.specific, system, function(err, result) {
        logger.info('analysis complete');
        if (err) {
          logger.error(err);
        }
        cb(err, result, system);
      });
    });
  };



  var getDeployedOrHeadRevisionId = function(systemId, cb) {
    _sr.getDeployedRevisionId(systemId, function(err, revId) {
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



  var checkSystem = function(user, identifier, out, cb) {
    logger.info('check system: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    analyzeSystem(user, systemId, out, function(err, analyzed, system) {
      if (err) { return cb(err); }
      getDeployedOrHeadRevisionId(systemId, function(err, deployedId) {

        var systemRoot = _sr.repoPath(systemId);
        analyzed.repoPath = systemRoot;
        system.repoPath = systemRoot;

        _deployer.deploy(user, systemId, deployedId, analyzed, system, _sr, 'preview', out, function(err/*, result*/) {
          cb(err, {plan: out.getPlan(), ops: out.operations()});
        });
      });
    });
  };



  var fixSystem = function(user, identifier, out, cb) {
    logger.info('fix system: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    analyzeSystem(user, systemId, out, function(err, analyzed, system) {
      if (err) { return cb(err); }

      getDeployedOrHeadRevisionId(systemId, function(err, deployedId) {
        _deployer.deploy(user, systemId, deployedId, analyzed, system, _sr, 'live', out, function(err, result) {
          cb(err, result);
        });
      });
    });
  };



  var compileSystem = function(user, identifier, platform, out, cb) {
    logger.info('compile system: ' + identifier);
    var systemId = _sr.findSystem(identifier);
    var repoPath = _sr.repoPath(systemId);

    if (!platform || platform === 'undefined') {
      return cb(new Error('missing required parameter: platform'));
    }

    getHeadSystem(systemId, function(err, head) {
      _compiler.compile(head, repoPath, platform, out, function(err, system) {
        if (err) { return cb(err); }
        _sr.commitRevision(user, system.id, 'system compile', system, function(err, revisionId) {
          if (err) { return cb(err); }
          cb(null, revisionId);
        });
      });
    });
  };



  var construct = function() {
    _sys = require('./container');
    _synchrotron = require('./synchrotron')(options);
    _builder = require('./builder')(options, _containers);
    _deployer = require('./deployer')(options, _containers);
    _compiler = require('./compiler')(logger);
  };



  construct();
  return {
    listSystems: listSystems,
    createSystem: createSystem,
    getHeadSystem: getHeadSystem,
    getDeployedSystem: getDeployedSystem,
    putSystem: putSystem,
    //deleteSystem: deleteSystem,
    cloneSystem: cloneSystem,
    linkSystem: linkSystem,
    unlinkSystem: unlinkSystem,
    syncSystem: syncSystem,
    addRemote: addRemote,
    fixSystem: fixSystem,
    compileSystem: compileSystem,

    listContainers: listContainers,
    buildContainer: buildContainer,
    buildAllContainers: buildAllContainers,
    addContainer: addContainer,
    putContainer: putContainer,
    deleteContainer: deleteContainer,
    deployRevision: deployRevision,
    previewRevision : previewRevision,

    listRevisions: listRevisions,
    getRevision: getRevision,
    markRevision: markRevision,

    timeline: timeline,

    analyzeSystem: analyzeSystem,
    checkSystem: checkSystem
  };
};

