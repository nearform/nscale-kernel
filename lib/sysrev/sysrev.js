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

var path = require('path');
var _ = require('lodash');
var fse = require('fs-extra');
var uuid = require('uuid');
var git = require('./gitutil');
var srMeta = require('./sysrevMeta');
var ku = require('../kutils');
var generify = require('generify');
var path = require('path');
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
module.exports = function(options, logger) {

  var _meta;



  /**
   * ensures that system has all required files
   */
  var initNscaleFiles = function(repoPath, doc, done) {
    generify(path.join(__dirname, 'template'), repoPath, {
      name: doc.name,
      namespace: doc.namespace,
      id: doc.id
    }, done);
  };

  /**
   * checks if a directory is a system (has all the required files and correct
   * system.json and system.js
   */
  var validateSystem = function(repoPath) {
    var sys, doc;

    if (fse.existsSync(path.join(repoPath, 'system.js'))) {
      sys = require(repoPath + '/system.js');
    }
    if (fse.existsSync(path.join(repoPath, 'system.json'))) {
      doc = fse.readFileSync(path.join(repoPath, 'system.json'), 'utf8');
      try {
        doc = JSON.parse(doc);
      }
      catch (e) {
        return new Error('invalid system: ' + e.message);
      }
    }

    if (!sys) {
      return new Error('missing system.js, is this an nscale repository?');
    }
    if (!sys.name) {
      return new Error('missing name in system.js, correct and try again');
    }
    if (!sys.namespace) {
      return new Error('missing namespace in system.js, correct and try again');
    }
    if (!sys.id) {
      return new Error('missing id in system.js, correct and try again');
    }
    if (sys.id !== doc.id) {
      return new Error('system id mismatch system.js <-> system.json, correct and try again');
    }
  };

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
    if (timeline.entries) {timeline.entries.reverse();}
    cb(null, timeline);
  };



  /**
   * make a commit to local git repository
   * TODO: implement seperate push functionality
   * TODO: replace with git hub id
   */
  var commit = function(user, systemId, message, cb) {
    logger.info('commiting revision: ' + systemId + ', ' + message);
    var repoPath = _meta.repoPath(systemId);
    git.commit(repoPath, message, user.name, user.email, cb);
  };



  /**
   * create a new system repository
   */
  var createSystem = function(user, namespace, name, cwd, cb) {
    //var repoName = namespace + '_' + name;
    var repoName = name;
    var doc = _.extend({}, blank);
    var repoPath = path.join(cwd, repoName);

    doc.name = name;
    doc.namespace = namespace;
    doc.id = uuid.v4();

    if (!fse.existsSync(path.join(repoPath, 'system.json'))) {
      fse.mkdirpSync(repoPath);
      initNscaleFiles(repoPath, doc, function() {
        git.createRepository(repoPath, user.name, user.email, function(err) {
          if (err) { return cb(err); }
          _meta.register(user, namespace, name, repoName, cwd + '/' + repoName, doc.id, function(err) {
            writeTimeline(user, doc.id, 'create', 'system created');
            cb(err, {id: doc.id, err: err});
          });
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
  var cloneSystem = function(user, url, cwd, cb) {
    var repoName;
    var repoPath;

    if (ku.checkGitUrl(url)) {
      repoName = ku.parseGitUrl(url).repo;
      repoPath = path.join(cwd, repoName);
      git.clone(url, repoPath, function(err) {
        if (err) { return cb(err); }

        var validationError = validateSystem(repoPath);
        if (validationError) { return cb(validationError); }
        var sys = require(repoPath + '/system.js');
        delete require.cache[repoPath + '/system.js'];

        git.initClonedRepo(repoPath, user.name, user.email, function(err) {
          if (err) { return cb(err); }
          // namespce and name parameters...
          _meta.register(user, sys.namespace, sys.name, repoName, repoPath, sys.id, function(err) {
            writeTimeline(user, sys.id, 'clone', 'system cloned');
            cb(err, {id: sys.id, err: err});
          });
        });
      });
    }
    else {
      cb(new Error('invalid url: ' + url));
    }
  };



  /**
   * create a new system by linking from local file system
   */
  var linkSystem = function(user, path_, cwd, cb) {
    var repoPath = path.resolve(cwd, path_);
    var sys;

    var validationError = validateSystem(repoPath);
    if (validationError) { return cb(validationError); }
    sys = require(repoPath + '/system.js');
    delete require.cache[repoPath + '/system.js'];

    _meta.register(user, sys.namespace, sys.name, path.basename(repoPath), repoPath, sys.id, function(err) {
      writeTimeline(user, sys.id, 'link', 'system linked');
      cb(err, {id: sys.id, err: err});
    });
  };



  /**
   * unlink system from the daemon
   */
  var unlinkSystem = function(user, systemId, cb) {
    _meta.unregister(user, systemId, cb);
  };

  var syncSystem = function(user, identifier, cb) {
    var systemId = findSystem(identifier);
    var repoPath = _meta.repoPath(systemId);
    writeTimeline(user, systemId, 'sync', 'repository synched');
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
    return _meta.systemExists(namespace, name);
  };



  /**
   * commit a new version of the system, the head of the commit log
   * may be ahead of the actual deployed version of the system
   */
  var commitRevision = function(user, systemId, description, cb) {
    //var repoPath = _meta.repoPath(systemId);
    //delete sysJson.repoPath;
    //fse.writeFileSync(repoPath + '/system.json', JSON.stringify(sysJson, null, 2), 'utf8');
    commit(user, systemId, description, cb);
  };



  /**
   * commit a new version of the system, the head of the commit log
   * may be ahead of the actual deployed version of the system
   */
  var writeFile = function(systemId, fileName, contents, cb) {
    var repoPath = _meta.repoPath(systemId);
    fse.writeFile(repoPath + '/' + fileName, contents, 'utf8', function(err) {
      cb(err);
    });
  };



  /**
   * get the head revision for a system
   */
  var getHead = function(systemId, target, cb) {
    listRevisions(systemId, function(err, revs) {
      getRevision(systemId, revs[0].id, target, cb);
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
  var getRevision = function(systemId, revisionId, target, cb) {
    var repoPath = _meta.repoPath(systemId);
    git.getFileRevision(repoPath, revisionId, target + '.json', function(err, rev) {
      if (err) { return cb(err); }
      var s;
      try {
        s = JSON.parse(rev);
      }
      catch (e) {
        return cb(new Error('invalid system definition: ' + e.message), null);
      }
      cb(err, s);
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
  var getDeployedRevision = function(systemId, target, cb) {
    getDeployedRevisionId(systemId, function(err, revisionId) {
      if (err) { return cb(err); }
      if (revisionId) {
        getRevision(systemId, revisionId, target, cb);
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

    if (identifier !== 'head' && identifier !== 'latest') {
      listRevisions(systemId, function(err, revisions) {
        revision = _.find(revisions, function(revision) { return re.test(revision.id); });
        if (revision) {
          cb(err, revision.id);
        }
        else {
          cb(new Error('revision not found'));
        }
      });
    }
    else {
      getHeadRevisionId(systemId, cb);
    }
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



  var findContainer = function(systemId, identifier, target, cb) {
    var containerId;
    var containerDef;

    getHead(systemId, target, function(err, data) {
      if (err) { return cb(err); }
      if (data.containerDefinitions.length > 0) {
        _.each(data.containerDefinitions, function(cdef) {
          if (cdef.id === identifier) {
            containerId = cdef.id;
            containerDef = cdef;
          }
          else if (cdef.id.indexOf(identifier) !== -1) {
            containerId = cdef.id;
            containerDef = cdef;
          }
          else if (cdef.name === identifier) {
            containerId = cdef.id;
            containerDef = cdef;
          }
        });
        cb(null, containerId, containerDef);
      }
      else {
        cb(new Error('getHead returned 0 data'));
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



  var repoPath = function(systemId) {
    return _meta.repoPath(systemId);
  };



  return {
    boot: boot,
    createSystem: createSystem,
    cloneSystem: cloneSystem,
    linkSystem: linkSystem,
    unlinkSystem: unlinkSystem,
    syncSystem: syncSystem,
    addRemote: addRemote,
    systemExists: systemExists,
    commitRevision: commitRevision,
    writeFile: writeFile,
    markDeployedRevision: markDeployedRevision,
    markDeployedRevisionNoCommit: markDeployedRevisionNoCommit,
    getDeployedRevision: getDeployedRevision,
    getDeployedRevisionId: getDeployedRevisionId,
    listRevisions: listRevisions,
    getHead: getHead,
    getHeadRevisionId: getHeadRevisionId,
    getRevision: getRevision,
    listSystems: listSystems,
    findSystem: findSystem,
    findContainer: findContainer,
    findRevision: findRevision,
    addContainer: addContainer,
    putContainer: putContainer,
    deleteContainer: deleteContainer,
    getTimeline: getTimeline,
    writeTimeline: writeTimeline,
    repoPath: repoPath
  };
};


