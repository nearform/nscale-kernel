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

var logger = require('bunyan').createLogger({ name: 'nfd-kernel' });
var _ = require('underscore');



module.exports = function(options, _sr, _analyzer, _containers) {
  var _sys;
  var _builder;
  var _deployer;
  var _synchrotron;



  /**
   * list all of the available systems
   */
  var listSystems = function(cb) {
    var systems = _sr.listSystems();
    cb(null, systems);
  };



  /**
   * get the full head system definition (latest revision)
   */
  var getHeadSystem = function(identifier, cb) {
    var systemId = _sr.findSystem(identifier);
    _sr.getHead(systemId, cb);
  };



  /**
   * get the full deployed system definition
   */
  var getDeployedSystem = function(identifier, cb) {
    var systemId = _sr.findSystem(identifier);
    _sr.getDeployedRevision(systemId, cb);
  };



  /**
   * create a new  blank system
   */
  var createSystem = function(user, name, namespace, cb) {
    _sr.createSystem(user, namespace, name, cb);
  };



  /**
   * put the system definition, if the system doesn't exist it will be created
   */
  var putSystem = function(user, system, cb) {
    var doc = JSON.parse(system);

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
  var cloneSystem = function(user, url, cb) {
    _sr.cloneSystem(user, url, cb);
  };



  /**
   * pull/push system and sync with remote
   */
  var syncSystem = function(user, identifier, cb) {
    var systemId = _sr.findSystem(identifier);
    _sr.syncSystem(user, systemId, cb);
  };



  /**
   * add a remote url to the system repository
   */
  var addRemote = function(user, identifier, url, cb) {
    var systemId = _sr.findSystem(identifier);
    _sr.addRemote(user, systemId, url, cb);
  };



  /**
   * list all of the available containers in a system
   */
  var listContainers = function(identifier, cb) {
    debugger;
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
    var systemId = _sr.findSystem(identifier);
    var cont = JSON.parse(container);
    _sr.addContainer(user, systemId, cont, cb);
  };



  /**
   * update the container
   */
  var putContainer = function(user, identifier, container, cb) {
    var systemId = _sr.findSystem(identifier);
    var cont = JSON.parse(container);
    _sr.putContainer(user, systemId, cont, cb);
  };



  /**
   * delete the container
   */
  var deleteContainer = function(user, identifier, containerIdentifier, cb) {
    var systemId = _sr.findSystem(identifier);
    _sr.deleteContainer(user, systemId, containerIdentifier, cb);
  };



  /**
   * build a container
   */
  var buildContainer = function(user, identifier, containerIdentifier, out, cb) {
    var systemId = _sr.findSystem(identifier);
    out.initProgress(9);

    debugger;
    _sr.findContainer(systemId, containerIdentifier, function(err, containerDefId) {
      if (err) { out.stdout(err); logger.error(err); return cb(err); }
      _sr.getHead(systemId, function(err, json) {
        var root = _sys(options);

        out.progress();
        root.load(json);
        var containerDef = root.containerDefByDefId(containerDefId);

        _synchrotron.synch(json, containerDef, out, function(err) {
          if (err) { out.stdout(err); logger.error(err); return cb(err); }
          out.progress();

          _builder.build(json, containerDef, out, function(err, specific) {
            if (err) { out.stdout(err); logger.error(err); return cb(err); }
            out.progress();
            _sr.writeTimeline(user, systemId, 'build', 'built container: ' + specific.dockerImageId);
            _sr.commitRevision(user, systemId, 'built container: ' + specific.dockerImageId, json, function(err) {
              out.progress();
              out.progress();
              return cb(err);
            });
          });
        });
      });
    });
  };



  /**
   * deploy the current or specified revision
   */
  var deploySystem = function(user, identifier, revisionIdentifier, mode, out, cb) {
    var systemId = _sr.findSystem(identifier);
    debugger;
    _sr.findRevision(systemId, revisionIdentifier, function(err, revisionId) {
      if (err) { return cb(err); }

      if (!mode) { mode = 'live'; }
      if (!revisionId) {
        debugger;
        _sr.getHeadRevisionId(systemId, function(err, headId) {
          debugger;
          out.stdout('deploying...', 'info');
          _deployer.deploy(user, systemId, headId, _sr, mode, out, function(err, result) {
            cb(err, result);
          });
        });
      }
      else {
        debugger;
        out.stdout('deploying...', 'info');
        _deployer.deploy(user, systemId, revisionId, _sr, mode, out, function(err, result) {
          cb(err, result);
        });
      }
    });
  };



  /**
   * preview a system deploy
   */
  var previewSystemDeploy = function(user, identifier, revisionIdentifier, out, cb) {
    deploySystem(user, identifier, revisionIdentifier, 'preview', out, function(err) {
      cb(err, {plan: out.getPlan(), ops: out.operations()});
    });
  };



  /**
   * get the revision history for a system
   */
  var listRevisions = function(identifier, cb) {
    if (!identifier) {
      return cb(new Error('no identifier'));
    }
    var systemId = _sr.findSystem(identifier);

    if (!systemId) {
      return cb(new Error('system not found'));
    }

    _sr.listRevisions(systemId, function(err, revisions) {
      console.log('++++');
      console.log(err);
      console.log(revisions);
      cb(err, revisions);
    });
  };



  /**
   * get a specific revision
   */
  var getRevision = function(identifier, revisionIdentifier, cb) {
    var systemId = _sr.findSystem(identifier);
    _sr.findRevision(systemId, revisionIdentifier, function(err, revisionId) {
      _sr.getRevision(systemId, revisionId, cb);
    });
  };



  var markRevision = function(user, identifier, revisionIdentifier, cb) {
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



  var analyzeSystem = function(user, identifier, out, cb) {
    var systemId = _sr.findSystem(identifier);
    _analyzer.analyse(options.analyzer, function(err, result) {
      cb(err, result);
    });
  };



  var checkSystem = function(user, identifier, out, cb) {
    var systemId = _sr.findSystem(identifier);
    _analyzer.analyse(options.analyzer, function(err, result) {
      cb(err, result);
    });
  };



  var construct = function() {
    _sys = require('./container');
    _synchrotron = require('./synchrotron')(options);
    _builder = require('./builder')(options, _containers);
    /*
    _deployer = require('./topology/deploy/deployer')(options);
    _analyzer = require('./topology/analyse/aws/analyse');
    */
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
    syncSystem: syncSystem,
    addRemote: addRemote,

    listContainers: listContainers,
    buildContainer: buildContainer,
    addContainer: addContainer,
    putContainer: putContainer,
    deleteContainer: deleteContainer,
    deploySystem: deploySystem,
    previewSystemDeploy: previewSystemDeploy,

    listRevisions: listRevisions,
    getRevision: getRevision,
    markRevision: markRevision,

    timeline: timeline,

    analyzeSystem: analyzeSystem,
    checkSystem: checkSystem
  };
};

