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
var async = require('async');
var _ = require('lodash');
var fse = require('fs-extra');
var fs = require('fs');
var uuid = require('uuid');
var git = require('./gitutil');
var ngit = require('nodegit');
var srMeta = require('./sysrevMeta');
var generify = require('generify');
var path = require('path');
var split2 = require('split2');
var callback = require('callback-stream');
var baseTag = 'refs/tags/deployed-';
var editsTag = 'refs/tags/edits-';
var blank = {'name': '',
             'namespace': '',
             'id': '',
             'containerDefinitions': [],
             'topology': {'containers': {}}};
var EDITS = 'edits';



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
    logger.info('committing revision: ' + systemId + ', ' + message);
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



  var systemExists = function(namespace, name) {
    return _meta.systemExists(namespace, name);
  };



  /**
   * commit a new version of the system, the head of the commit log
   * may be ahead of the actual deployed version of the system
   */
  var commitRevision = function(user, systemId, description, cb) {
    commit(user, systemId, description, cb);
  };



  /**
   * commit a new version of the system, the head of the commit log
   * may be ahead of the actual deployed version of the system
   */
  var writeFile = function(systemId, fileName, contents, cb) {
    var repoPath = _meta.repoPath(systemId);
    fse.writeFile(path.join(repoPath, fileName), contents, 'utf8', cb);
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
      cb(err, revs && revs[0] && revs[0].id);
    });
  };



  /**
   * get the head revision id for a system
   */
  var getComittedHeadRevisionId = function(systemId, cb) {
    listRevisions(systemId, function(err, revs) {
      if (revs[0].id === EDITS) {
        cb(err, revs && revs[1] && revs[1].id);
      }
      else {
        cb(err, revs && revs[0] && revs[0].id);
      }
    });
  };



  /**
   * get a revision from the history, with a specific version number
   */
  var _getRevision = function(systemId, revisionId, target, cb) {
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


  var _getOnDiskVersion = function(systemId, revisionId, target, cb) {
    var repoPath = _meta.repoPath(systemId);
    fs.readFile(repoPath + '/' + target + '.json', 'utf8', function(err, rev) {
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
   * get a revision from the history, with abbreviation support
   */
  var getRevision = function(systemId, revisionId, target, cb) {
    if (revisionId === EDITS) {
      _getOnDiskVersion(systemId, revisionId, target, cb);
    }
    else {
      findRevision(systemId, revisionId, function(err, rev) {
        if (err) { return cb(err); }
        if (rev === EDITS) {
          _getOnDiskVersion(systemId, revisionId, target, cb);
        }
        else {
          _getRevision(systemId, rev, target, cb);
        }
      });
    }
  };

  /*
tesnt this to fuck and PR and release 
  move onto proxy - must be testing it tomorrow night
  app dynamics only - load to AJ
  */

  /**
   * set the currently deployed revision, there will only ever be one deployed revision
   * clear the currently deployed flag and set the deployed flag against the specified revision
   */
  var markDeployedRevision = function(user, systemId, revisionId, env, cb) {
    var repoPath = _meta.repoPath(systemId);
    var removeTag;
    var addTag;
    var revId;
    
    getComittedHeadRevisionId(systemId, function(err, comittedHeadId) {
      if (revisionId === EDITS) {
        removeTag = baseTag + env;
        addTag = editsTag + env;
        revId = comittedHeadId;
      }
      else {
        addTag = baseTag + env;
        removeTag = editsTag + env;
        revId = revisionId;
      }

      ngit.Repository.open(repoPath, function(err, repo) {
        if (err) { return cb(err); }
        ngit.Reference.remove(repo, removeTag);
        repo.getCommit(revId, function(err, commit) {
          if (err) { return cb(err); }
          var now = Math.round(Date.now() / 1000);
          var author = ngit.Signature.create(user.name, user.email, now, 0);
          ngit.Reference.create(repo, addTag, commit, 1, author, 'Tagged ' + addTag)
            .then(function() {
              writeTimeline(user, systemId, 'deployed revision', { revision: revisionId }, function() {
                cb();
              });
            })
            .catch(cb);
        });
      });
    });
  };



  /**
   * get the currently deployed revision
   */
  var getDeployedRevisionId = function(systemId, env, cb) {
    var repoPath = _meta.repoPath(systemId);
    var tagName = baseTag + env;
    var editsTagName = editsTag + env;

    ngit.Repository.open(repoPath, function(err, repo) {
      if (err) { return cb(err); }

      ngit.Reference.nameToId(repo, tagName, function(err, head) {
        if (err && (!err.message || err.message.indexOf('not found') === -1)) { return cb(err); }
        if (head) {
          cb(null, head.toString());
        }
        else {
          ngit.Reference.nameToId(repo, editsTagName, function(err) {
            if (err) { return cb(err); }
            cb(null, EDITS);
          });
        }
      });
    });
  };



  var getDeployedTargets = function(systemId, cb) {
    var repoPath = _meta.repoPath(systemId);

    ngit.Repository.open(repoPath, function(err, repo) {
      if (err) { return cb(err); }
      ngit.Reference.list(repo, function(err, refNames) {
        if (err) { return cb(err); }

        var deployed = refNames.filter(function(ref) {
          return ref.indexOf(baseTag) === 0 || ref.indexOf(editsTag) === 0;
        });

        async.map(deployed, function(ref, cb) {
          var env = ref.replace(baseTag, '');
          env = env.replace(editsTag, '');
          ngit.Reference.nameToId(repo, ref, function(err, commit) {
            if (err) { return cb(err); }
            if (ref.indexOf(baseTag) >= 0) {
              cb(null, {env: env, commit: commit.toString()});
            }
            else {
              cb(null, {env: env, commit: EDITS});
            }
          });
        }, cb);
      });
    });
  };



  /**
   * get the currently deployed revision
   */
  var getDeployedRevision = function(systemId, target, cb) {
    getDeployedRevisionId(systemId, target, function(err, revisionId) {
      if (err) { return cb(err); }
      if (revisionId === EDITS) {
        _getOnDiskVersion(systemId, revisionId, target, cb);
      }
      else {
        _getRevision(systemId, revisionId, target, cb);
      }
    });
  };



  /**
   * list all of the available revisions in the system
   */
  var listRevisions = function(systemId, cb) {
    var repoPath = _meta.repoPath(systemId);
    getDeployedTargets(systemId, function(err, targets) {
      if (err) { return cb(err); }
      git.listRevisions(repoPath, function(err, revisions) {
        revisions.forEach(function(revision) {
          var deployedTo = _.find(targets, function(target) { return target.commit === revision.id; });
          if (deployedTo) {
            revision.deployedTo = deployedTo.env;
          }
        });
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



  var listSystems = function() {
    return _meta.listSystems();
  };



  var findSystem = function(identifier) {
    return _meta.findSystem(identifier);
  };



  var findContainer = function(systemId, revision, identifier, target, cb) {
    var containerId;
    var containerDef;

    getRevision(systemId, revision, target, function(err, data) {
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
    linkSystem: linkSystem,
    unlinkSystem: unlinkSystem,
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
    repoPath: repoPath,
    getDeployedTargets: getDeployedTargets
  };
};


