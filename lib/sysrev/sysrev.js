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
var fse = require('fs-extra');
var uuid = require('uuid');
var git = require('./gitutil');
var srMeta = require('./sysrevMeta');
var blank = {'name': '',
             'namespace': '',
             'id': '',
             'containerDefinitions': [],
             'topology': {'containers': {}}};



/**
 * maintains system commit log and history using nodegit
 * uses master branch only
 * need to be able to create a new repo on demand - for new system definition
 */
module.exports = function(options) {

  var _meta;



  /**
   * timeline format
   * {
   *   entries: [{user: user, ts: new Date(), type: entryType, details: details},...
   * }
   */
  // TODO fix this - need to just do file append rather than read / write
  var writeTimeline = function(user, systemId, entryType, details) {
    var repoPath = _meta.repoPath(systemId);
    var timeline;
    var entry;

    timeline = fse.readFileSync(repoPath + '/timeline.json', 'utf8');
    timeline = JSON.parse(timeline);
    entry = {user: user, ts: new Date(), type: entryType, details: details};
    timeline.entries.push(entry);
    fse.writeFileSync(repoPath + '/timeline.json', JSON.stringify(timeline), 'utf8');
  };



  // TODO: fix this - don't want huge blocks of JSON need to partition up
  var getTimeline = function(systemId, cb) {
    var repoPath = _meta.repoPath(systemId);
    var timeline;

    timeline = fse.readFileSync(repoPath + '/timeline.json', 'utf8');
    timeline = JSON.parse(timeline);
    cb(null, timeline);
  };



  /**
   * make a commit to local git repository
   * TODO: implement seperate push functionality
   * TODO: replace with git hub id
   */
  var commit = function(user, systemId, message, cb) {
    var repoPath = _meta.repoPath(systemId);
    git.commit(repoPath, ['system.json', 'timeline.json', 'deployed.json'], message, user.name, user.email, cb);
  };



  /**
   * create a new system repository
   */
  var createSystem = function(user, namespace, name, cb) {
    var repoName = namespace + '_' + name;
    var doc = _.extend({}, blank);

    doc.name = name;
    doc.namespace = namespace;
    doc.id = uuid.v4();

    if (!fse.existsSync(options.systemsRoot + '/' + repoName + '/system.json')) {
      fse.mkdirpSync(options.systemsRoot + '/' + repoName);
      fse.writeFileSync(options.systemsRoot + '/' + repoName + '/system.json', JSON.stringify(doc, null, 2), 'utf8');
      fse.writeFileSync(options.systemsRoot + '/' + repoName + '/deployed.json', '{"deployed": null}', 'utf8');
      fse.writeFileSync(options.systemsRoot + '/' + repoName + '/timeline.json', '{"entries": []}', 'utf8');
      git.createRepository(options.systemsRoot + '/' + repoName, ['system.json', 'deployed.json', 'timeline.json'], user.name, user.email, function(err) {
        if (err) { return cb(err); }
        _meta.register(user, repoName, options.systemsRoot + '/' + repoName, doc.id, function(err) {
          writeTimeline(user, doc.id, 'create', 'system created');
          cb(err, {id: doc.id, err: err});
        });
      });
    }
    else {
      cb(null, { id: _meta.repoId(repoName), err: null});
    }
  };



  /**
   * create a new system by pulling from an existing repository
   *
   * var test1 = 'git@github.com:pelger/mlshack.git';
   * var test2 = 'https://github.com/pelger/mlshack.git';
   */
  var cloneSystem = function(user, url, cb) {
    var regexp = /[a-zA-Z@.:\/]*\/([a-zA-Z]+)\.git/;
    var repoName;
    var doc;


    // repo name is wrong... needs to be as per import sucd_StartupDeathClock (namespace - name)
    // fix and rego

    if (regexp.test(url)) {
      repoName = regexp.exec(url)[1];
      git.clone(url, options.systemsRoot + '/' + repoName, function(err) {
        if (err) { return cb(err); }
        doc = fse.readFileSync(options.systemsRoot + '/' + repoName + '/system.json', 'utf8');
        if (fse.existsSync(options.systemsRoot + '/' + repoName + '/system.json')) {
          doc = fse.readFileSync(options.systemsRoot + '/' + repoName + '/system.json', 'utf8');
          doc = JSON.parse(doc);
        }
        else {
          doc = _.extend({}, blank);
          doc.name = repoName;
          doc.namespace = repoName;
          doc.id = uuid.v4();
          doc.remoteUrl = url;
          fse.writeFileSync(options.systemsRoot + '/' + repoName + '/system.json', JSON.stringify(doc, null, 2), 'utf8');
          fse.writeFileSync(options.systemsRoot + '/' + repoName + '/deployed.json', '{"deployed": null}', 'utf8');
          fse.writeFileSync(options.systemsRoot + '/' + repoName + '/timeline.json', '{"entries": []}', 'utf8');
        }
        git.initClonedRepo(options.systemsRoot + '/' + repoName, ['system.json', 'deployed.json', 'timeline.json'], user.name, user.email, function(err) {
          if (err) { return cb(err); }
          _meta.register(user, repoName, options.systemsRoot + '/' + repoName, doc.id, function(err) {
            writeTimeline(user, doc.id, 'clone', 'system cloned');
            cb(err, {id: doc.id, err: err});
          });
        });
      });
    }
    else {
      cb('invalid url');
    }
  };



  var syncSystem = function(user, identifier, cb) {
    var systemId = findSystem(identifier);
    var repoPath = _meta.repoPath(systemId);
    writeTimeline(user, systemId, 'sync', 'repository synched');
    //commit(user, systemId, 'sync' + revisionId, cb);
    git.sync(repoPath, cb);
  };



  var addRemote = function(user, identifier, url, cb) {
    var systemId = findSystem(identifier);
    var repoPath = _meta.repoPath(systemId);
    writeTimeline(user, systemId, 'remote add', 'remote url added (' + url + ')');
    exports.remoteAdd(repoPath, url, function(err) {
      cb(err);
    });
  };



  var systemExists = function(namespace, name) {
    var repoName = namespace + '_' + name;
    return fse.existsSync(options.systemsRoot + '/' + repoName + '/system.json');
  };



  /**
   * commit a new version of the system, the head of the commit log
   * may be ahead of the actual deployed version of the system
   */
  var commitRevision = function(user, systemId, description, sysJson, cb) {
    var repoPath = _meta.repoPath(systemId);
    fse.writeFileSync(repoPath + '/system.json', JSON.stringify(sysJson, null, 2), 'utf8');
    //writeTimeline(user, systemId, 'commit', 'system committed');
    commit(user, systemId, description, cb);
  };



  /**
   * get the head revision for a system
   */
  var getHead = function(systemId, cb) {
    listRevisions(systemId, function(err, revs) {
      getRevision(systemId, revs[0].id, cb);
    });
  };



  /**
   * get the head revision id for a system
   */
  var getHeadRevisionId = function(systemId, cb) {
    listRevisions(systemId, function(err, revs) {
      cb(err, revs[0].id);
    });
  };



  /**
   * get a revision from the history, if no version number is specified get the head
   */
  var getRevision = function(systemId, revisionId, cb) {
    var repoPath = _meta.repoPath(systemId);
    git.getFileRevision(repoPath, revisionId, 'system.json', function(err, rev) {
      cb(err, JSON.parse(rev));
    });
  };



  /**
   * set the currently deployed revision, there will only ever be one deployed revision
   * clear the currently deployed flag and set the deployed flag against the specified revision
   */
  var markDeployedRevision = function(user, systemId, revisionId, cb) {
    var repoPath = _meta.repoPath(systemId);
    fse.writeFileSync(repoPath + '/deployed.json', '{"deployed": "' + revisionId + '"}', 'utf8');
    writeTimeline(user, systemId, 'deploy', 'system deployed to revision ' + revisionId);
    cb(null);
    //commit(user, systemId, 'system deployed to revision ' + revisionId, cb);
  };



  var markDeployedRevisionNoCommit = function(user, systemId, revisionId, cb) {
    var repoPath = _meta.repoPath(systemId);
    fse.writeFileSync(repoPath + '/deployed.json', '{"deployed": "' + revisionId + '"}', 'utf8');
    writeTimeline(user, systemId, 'deploy', 'system deployed to revision ' + revisionId);
    cb(null);
  };



  /**
   * get the currently deployed revision
   */
  var getDeployedRevisionId = function(systemId, cb) {
    var repoPath = _meta.repoPath(systemId);
    fse.readFile(repoPath + '/deployed.json', 'utf8', function(err, data) {
      var deployed = JSON.parse(data);
      cb(err, deployed.deployed);
    });
  };



  /**
   * get the currently deployed revision
   */
  var getDeployedRevision = function(systemId, cb) {
    getDeployedRevisionId(systemId, function(err, revisionId) {
      if (err) { return cb(err); }
      if (revisionId) {
        getRevision(systemId, revisionId, cb);
      }
      else {
        cb(null, null);
      }
    });
  };



  /**
   * list all of the available revisions in the system
   */
  //TODO: needs to show the deployed revision
  var listRevisions = function(systemId, cb) {
    var repoPath = _meta.repoPath(systemId);
    git.listRevisions(repoPath, function(err, revisions) {
      getDeployedRevisionId(systemId, function(err, revisionId) {
        if (revisionId) {
          var deployed = _.find(revisions, function(revision) { return revisionId === revision.id; });
          if (deployed) {
            deployed.deployed = true;
          }
        }
        cb(err, revisions);
      });
    });
  };



  /**
   * find revision id by parital or full identifier
   */
  var findRevision = function(systemId, identifier, cb) {
    var re = new RegExp('^' + identifier + '.*', ['i']);
    var revision;

    listRevisions(systemId, function(err, revisions) {
      revision = _.find(revisions, function(revision) { return re.test(revision.id); });
      cb(err, revision.id);
    });
  };



  var sid = function(namespace, name) {
    return _meta.repoId(namespace + '_' + name);
  };



  var boot = function(cb) {
    _meta = srMeta(options);
    _meta.boot(cb);
  };



  var listSystems = function(cb) {
    return _meta.listSystems(cb);
  };



  var findSystem = function(identifier) {
    return _meta.findSystem(identifier);
  };



  var findContainer = function(systemId, identifier, cb) {
    var containerId;

    getHead(systemId, function(err, data) {
      if (err) { return cb(err); }
      if (data.containerDefinitions.length > 0) {
        _.each(data.containerDefinitions, function(cdef) {
          if (cdef.id === identifier) {
            containerId = cdef.id;
          }
          else if (cdef.id.indexOf(identifier) !== -1) {
            containerId = cdef.id;
          }
          else if (cdef.name === identifier) {
            containerId = cdef.id;
          }
        });
        cb(null, containerId);
      }
      else {
        cb('getHead returned 0 data');
      }
    });
  };



  var addContainer = function(user, systemId, cont, cb) {
    getHead(systemId, function(err, head) {
      if (err) { return cb(err); }
      head.containerDefinitions.push(cont);
      commitRevision(user, systemId, 'added container', head, cb);
    });
  };



  var putContainer = function(user, systemId, cont, cb) {
    var foundIdx = -1;
    var idx = 0;

    getHead(systemId, function(err, head) {
      if (err) { return cb(err); }
      _.each(head.containerDefinitions, function(cdef) {
        if (cdef.id === cont.id) {
          foundIdx = idx;
        }
        ++idx;
      });
      if (foundIdx !== -1) {
        head.containerDefinitions[foundIdx] = cont;
      }
      commitRevision(user, systemId, 'updated container', head, cb);
    });
  };



  var deleteContainer = function(user, systemId, identifier, cb) {
    var foundIdx = -1;
    var idx = 0;

    findContainer(systemId, identifier, function(err, containerId) {
      if (err) { return cb(err); }
      getHead(systemId, function(err, head) {
        if (err) { return cb(err); }
        _.each(head.containerDefinitions, function(cdef) {
          if (cdef.id === containerId) {
            foundIdx = idx;
          }
          ++idx;
        });
        if (foundIdx !== -1) {
          delete head.containerDefinitions[foundIdx];
          head.containerDefinitions.splice(foundIdx, 1);
        }
        commitRevision(user, systemId, 'removed container', head, cb);
      });
    });
  };



  return {
    boot: boot,
    createSystem: createSystem,
    cloneSystem: cloneSystem,
    syncSystem: syncSystem,
    addRemote: addRemote,
    systemExists: systemExists,
    commitRevision: commitRevision,
    markDeployedRevision: markDeployedRevision,
    markDeployedRevisionNoCommit: markDeployedRevisionNoCommit,
    getDeployedRevision: getDeployedRevision,
    getDeployedRevisionId: getDeployedRevisionId,
    listRevisions: listRevisions,
    getHead: getHead,
    getHeadRevisionId: getHeadRevisionId,
    getRevision: getRevision,
    sid: sid,
    listSystems: listSystems,
    findSystem: findSystem,
    findContainer: findContainer,
    findRevision: findRevision,
    addContainer: addContainer,
    putContainer: putContainer,
    deleteContainer: deleteContainer,
    getTimeline: getTimeline,
    writeTimeline: writeTimeline
  };
};


