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



/**
 * maintains system commit log and history using nodegit
 * uses master branch only
 * need to be able to create a new repo on demand - for new system definition
 */
module.exports = function(options, logger) {

  var _meta = new srMeta(options);



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



  var systemExists = function(namespace, name) {
    return _meta.systemExists(namespace, name);
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
        cb(new Error('getHead returned 0 data'));
      }
    });
  };



  var repoPath = function(systemId) {
    return _meta.repoPath(systemId);
  };



  return {
    systemExists: systemExists,
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
    getTimeline: getTimeline,
    writeTimeline: writeTimeline,
    repoPath: repoPath
  };
};


