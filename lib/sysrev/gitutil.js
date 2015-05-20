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

var fse = require('fs-extra');
var ngit = require('nodegit');
var remote = require('gift');
var exec = require('child_process').exec;
var assert = require('assert');
var EDITS = 'edits';


exports.clone = function(url, path, cb) {
  remote.clone(url, path, function(err, repo) {
    cb(err, repo);
  });
};



exports.push = function(path, cb) {
  /*jshint camelcase: false */
  var repo = remote(path);
  repo.remote_push('origin', 'master', function(err) {
    cb(err);
  });
};



exports.sync = function(path, cb) {
  var repo = remote(path);
  repo.sync(function(err) {
    cb(err);
  });
};



exports.remoteAdd = function(path, url, cb) {
  /*jshint camelcase: false */
  var repo = remote(path);
  repo.remote_add('origin', url, function(err) {
    cb(err);
  });
};



var addFiles = function(repoPath, cb) {
  exec('git add --all', {cwd: repoPath}, function(err) {
    if (err) { return cb(err); }
    cb(null);
  });
};



/**
 * commits array of files to specified repository with given commit log message
 */
exports.commit = function(repoPath, message, authorName, authorMail, cb) {
  assert(repoPath);
  assert(message);
  assert(authorName);
  assert(authorMail);
  assert(cb);

  addFiles(repoPath, function(err) {
    if (err) { return cb(err); }
    ngit.Repository.open(repoPath, function(err, repo) {
      if (err) { return cb(err); }
      repo.openIndex(function(err, index) {
        if (err) { return cb(err); }
        index.write();
        index.writeTree(function(err, oid) {
          if (err) { return cb(err); }
          ngit.Reference.nameToId(repo, 'HEAD', function(err, head) {
            // swallowing any error, new repos does not have an head
            // if (err) { return cb(err); }
            authorName = authorName || 'nscale';
            authorMail = authorMail || 'nscale@nearform.com';

            var now = Math.round(Date.now() / 1000);
            var author = ngit.Signature.create(authorName, authorMail, now, 0);
            var committer = ngit.Signature.create(authorName, authorMail, now, 0);

            if (head) {
              repo.getCommit(head, function(err, prnt) {
                if (err) { return cb(err); }
                repo.createCommit('HEAD', author, committer, message, oid, [prnt], function(err, commitId) {
                  cb(err, commitId);
                });
              });
            }
            else {
              repo.createCommit('HEAD', author, committer, message, oid, [], function(err, commitId) {
                cb(err, commitId);
              });
            }
          });
        });
      });
    });
  });
};



/**
 * create a new repository
 */
exports.createRepository = function(repoPath, authorName, authorMail, cb) {
  fse.mkdirpSync(repoPath);
  // TODO try going back from promises.
  ngit.Repository
    .init(repoPath, 0)
    .done(function() {
      exports.commit(repoPath, 'first commit', authorName, authorMail, function(err, commitId) {
        cb(err, commitId);
      });
    }, cb);
};



/**
 * make commit on initial clone
 */
exports.initClonedRepo = function(repoPath, authorName, authorMail, cb) {
  exports.commit(repoPath, 'first commit', authorName, authorMail, function(err, commitId) {
    cb(err, commitId);
  });
};



var getEntry = function(commit, path, callback) {
  return commit.getTree().then(function(tree) {
    var entry = tree.getEntry(path);
    if (entry) {
      entry.then(function(entry) {
        if (typeof callback === 'function') {
          callback(null, entry);
        }
        return entry;
      }, callback);
    }
  }, callback);
};



/**
 * get a specific revision of a file
 */
exports.getFileRevision = function(repoPath, revisionId, file, cb) {
  ngit.Repository.open(repoPath, function(err, repo) {
    if (err) { return cb(err); }
    repo.getCommit(revisionId, function(err, commit) {
      if (err) { return cb(err); }
      getEntry(commit, file, function(err, entry) {
        if (err) { return cb(err); }
        entry.getBlob().done(function(blob) {
          cb(null, blob.toString());
        }, cb);
      });
    });
  });
};



/**
 * list all of the available revisions in the system
 */
exports.listRevisions = function(repoPath, cb) {
  var revisions = [];

  exports.hasEdits(repoPath, function(err, hasEdits) {
    if (hasEdits) {
      revisions.push({id: EDITS, author: '', date: (new Date()), message: 'uncomitted edits'});
    }

    ngit.Repository.open(repoPath, function(err, repo) {
      if (err) { return cb(err); }
      repo.head(function(err, head) {
        if (err) { return cb(err); }
        repo.getBranchCommit(head.name(), function(err, branch) {
          if (err) { return cb(err); }

          var history = branch.history();
          history.on('commit', function(commit) {
            var result = {id: commit.sha(),
                          author: commit.author().name() + ' <' + commit.author().email() + '>',
                          date: commit.date(),
                          message: commit.message()};
            revisions.push(result);
          });
          history.on('end', function() {
            cb(null, revisions);
          });
          history.on('error', cb);
          history.start();
        });
      });
    });
  });
};



exports.hasEdits = function(repoPath, cb) {
  ngit.Repository.open(repoPath).then(function(repo) {
    repo.getStatus().then(function(statuses) {
      cb(null, statuses.length);
    });
  });
};

