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
var uuid = require('uuid');



module.exports = function(options, sr) {
  var _sysRoot;
  var _builder;
  var _deployer;
  var _synchrotron;
  var _sr;



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



  var updateTopolgy = function(json, containerDef, container) {
    var prnt = json.topology.containers[container.containedBy];
    var newId = uuid.v4();
    var oldId = container.id;
    var idx;

    if (-1 !== (idx = prnt.contains.indexOf(oldId))) {
      prnt.contains[idx] = newId;
    }
    json.topology.containers[oldId].id = newId;
    //container.id = newId;

    json.topology.containers[newId] = json.topology.containers[oldId];
    delete json.topology.containers[oldId];
  };



  /**
   * build a container
   */
  var buildContainer = function(user, identifier, containerIdentifier, out, cb) {
    out.initProgress(9);
    var systemId = _sr.findSystem(identifier);

    _sr.findContainer(systemId, containerIdentifier, function(err, containerDefId) {
      if (err) { return cb(err); }
      _sr.getHead(systemId, function(err, json) {
        out.progress();
        var root = _sysRoot(options);
        var sync = _synchrotron(options);
        root.load(json);
        var containerDef = root.containerDefByDefId(containerDefId);
        sync.synch(json, containerDef, out, function(err) {
          out.progress();
          if (err) { return cb(err); }
          _builder.build(json, containerDef, out, function(err, specific) {
            out.progress();

            // update all instantiations of the container with the new speicific block
            // and replace identifiers for new uuids
            var matches = _.filter(json.topology.containers, function(container) {
              return container.containerDefinitionId === containerDefId;
            });
            _.each(matches, function(ctnr) { 
              ctnr.specific = specific; 
              updateTopolgy(json, containerDef, ctnr);
            });

            // increment the buildHead number on the conainer definintion
            if (containerDef.specific.buildHead) {
              containerDef.specific.buildHead = containerDef.specific.buildHead + 1;
              containerDef.specific.binary = specific.containerBinary;
              containerDef.specific.dockerImageId = specific.dockerImageId;
            }

            console.log('******** COMMITING REVISION');
            _sr.writeTimeline(user, systemId, 'build', 'built container: ' + specific.dockerImageId);
            _sr.commitRevision(user, systemId, 'built container: ' + specific.dockerImageId, json, function(err) {
              console.log('******** COMMITING REVISION');
              console.log(err);
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
    _sr.findRevision(systemId, revisionIdentifier, function(err, revisionId) {
      if (err) { return cb(err); }

      if (!mode) { mode = 'live'; }
      if (!revisionId) {
        _sr.getHead(systemId, function(err, head) {
          out.stdout('deploying...', 'info');
          _deployer.deploy(systemId, head.revision, _sr, mode, out, function(err, result) {
            cb(err, result);
          });
        });
      }
      else {
        out.stdout('deploying...', 'info');
        _deployer.deploy(systemId, revisionId, _sr, mode, out, function(err, result) {
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
    var systemId = _sr.findSystem(identifier);
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



  /**
   * get timeline
   */
  // TODO: update this to read git commit log
  var timeline = function(identifier, cb) {
    console.log('====>' + identifier);
    var systemId = _sr.findSystem(identifier);
    console.log('====> ' + systemId);
    _sr.getTimeline(systemId, function(err, timeline) {
      cb(err, timeline);
    });
  };



  var construct = function() {
    _sysRoot = require('./container/root');
    _synchrotron = require('./container/synch/syncrotron');
    _builder = require('./container/build/builder')(options);
    _deployer = require('./topology/deploy/deployer')(options);
    _sr = sr;
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

    timeline: timeline,
  };
};

