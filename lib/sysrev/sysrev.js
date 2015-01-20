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
var fs = require('fs');
var uuid = require('uuid');
var git = require('./gitutil');
var ngit = require('nodegit');
var srMeta = require('./sysrevMeta');
var ku = require('../kutils');
var generify = require('generify');
var path = require('path');
var split2 = require('split2');
var callback = require('callback-stream');
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
    var sys;

    if (fse.existsSync(path.join(repoPath, 'system.js'))) {
      // TODO extract in its own module
      sys = require(repoPath + '/system.js');
      delete require.cache[repoPath + '/system.js'];
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
  };

  /**
   * timeline format
   * [{user: user, ts: new Date(), type: entryType, details: details },...
   * custom values can be provided through the details object
   */
  // TODO change the format to include all the details in the main object
  var writeTimeline = function(user, systemId, entryType, details, cb) {
    var file = path.join(options.timelinesRoot, findSystem(systemId));
    if (typeof details === 'function') {
      cb = details;
      details = {};
    } else if (!details) {
      details = {};
    }

    var entry = {v: 0, user: user, ts: new Date(), type: entryType, details: details};
    fs.writeFile(file, JSON.stringify(entry) + '\n', { flag: 'a' }, function() {
      // error is swallowed, as this file does not really matter
      cb();
    });
  };


  var getTimeline = function(systemId, cb) {
    var file = path.join(options.timelinesRoot, findSystem(systemId));

    fs.createReadStream(file)
      .once('error', cb)
      .pipe(split2(function(line) {
        try {
          return JSON.parse(line);
        } catch(err) {
          // swallow bad lines
          return undefined;
        }
      }))
      .pipe(callback({ objectMode: true }, function(err, timeline) {
        if (err) { return cb(err); }
        cb(null, timeline.reverse());
      }));
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
    var repoName = name;
    var doc = _.extend({}, blank);
    var repoPath = path.join(cwd, repoName);

    doc.name = name;
    doc.namespace = namespace;
    doc.id = uuid.v4();

    if (!fse.existsSync(repoPath)) {
      fse.mkdirpSync(repoPath);
      initNscaleFiles(repoPath, doc, function() {
        git.createRepository(repoPath, user.name, user.email, function(err) {
          if (err) { return cb(err); }
          _meta.register(user, namespace, name, repoName, cwd + '/' + repoName, doc.id, function(err) {
            writeTimeline(user, doc.id, 'create', 'system created', function() {
              // swallow any errors here
              cb(err, {id: doc.id, err: err});
            });
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
            writeTimeline(user, sys.id, 'clone', 'system cloned', function() {
              // swallow any errors here
              cb(err, {id: sys.id, err: err});
            });
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
      writeTimeline(user, sys.id, 'link', 'system linked', function() {
        cb(err, {id: sys.id, err: err});
      });
    });
  };



  /**
   * unlink system from the daemon
   */
  var unlinkSystem = function(user, systemId, cb) {
    writeTimeline(user, systemId, 'system unlinked', function() {
      // swallow any errors here
      _meta.unregister(user, systemId, function(err) {
        cb(err);
      });
    });
  };

  var syncSystem = function(user, identifier, cb) {
    var systemId = findSystem(identifier);
    var repoPath = _meta.repoPath(systemId);
    git.sync(repoPath, function(err) {
      writeTimeline(user, systemId, 'sync', 'repository synched', function() {
        // swallow any errors here
        cb(err);
      });
    });
  };



  var addRemote = function(user, identifier, url, cb) {
    var systemId = findSystem(identifier);
    var repoPath = _meta.repoPath(systemId);
    exports.remoteAdd(repoPath, url, function(err) {
      writeTimeline(user, systemId, 'remote add', 'remote url added (' + url + ')', function() {
        cb(err);
      });
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
    //fse.writeFileSync(repoPath + '/system.json', JSON.stringify(sysJson, null, 3), 'utf8');
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
      if (err) { return cb(err); }
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
  var markDeployedRevision = function(user, systemId, revisionId, env, cb) {
    var repoPath = _meta.repoPath(systemId);
    var tagName = 'deployed-' + env;

    ngit.Repository.open(repoPath, function(err, repo) {
      if (err) { return cb(err); }
      repo.getCommit(revisionId, function(err, commit) {
        if (err) { return cb(err); }
        var now = Math.round(Date.now() / 1000);
        var author = ngit.Signature.create(user.name, user.email, now, 0);
        ngit.Reference.create(repo, 'refs/tags/' + tagName, commit, 1, author, 'Tagged ' + tagName)
          .then(function() {
            writeTimeline(user, systemId, 'deployed revision', { revision: revisionId }, function() {
              cb();
            });
          })
          .catch(cb);
      });
    });
  };




  /**
   * get the currently deployed revision
   */
  var getDeployedRevisionId = function(systemId, env, cb) {
    var repoPath = _meta.repoPath(systemId);
    var tagName = 'refs/tags/deployed-' + env;

    ngit.Repository.open(repoPath, function(err, repo) {
      if (err) { return cb(err); }

      ngit.Reference.nameToId(repo, tagName, function(err, head) {
        if (err) { return cb(err); }

        cb(null, head.toString());
      });
    });
  };



  /**
   * get the currently deployed revision
   */
  var getDeployedRevision = function(systemId, target, cb) {
    getDeployedRevisionId(systemId, target, function(err, revisionId) {
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
      //getDeployedRevisionId(systemId, function(err, revisionId) {
      //  if (revisionId) {
      //    var deployed = _.find(revisions, function(revision) { return revisionId === revision.id; });
      //    if (deployed) {
      //      deployed.deployed = true;
      //    }
      //  }
        cb(err, revisions);
      //});
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
    getTimeline: getTimeline,
    writeTimeline: writeTimeline,
    repoPath: repoPath
  };
};


