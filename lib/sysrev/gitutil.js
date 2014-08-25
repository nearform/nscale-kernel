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



exports.clone = function(url, path, cb) {
  remote.clone(url, path, function(err, repo) {
    cb(err, repo);
  });
};



exports.push = function(path, cb) {
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
  var repo = remote(path);
  repo.remote_add('origin', url, function(err) {
    cb(err);
  });
};



var addFiles = function(gitIndex, idx, files, cb) {
  if (idx < files.length) {
    gitIndex.addByPath(files[idx], function(err) {
      if (err) { return cb(err); }
      ++idx;
      addFiles(gitIndex, idx, files, cb);
    });
  }
  else {
    cb(null);
  }
};



/**
 * commits array of files to specified repository with given commit log message
 */
exports.commit = function(repoPath, files, message, authorName, authorMail, cb) {
  ngit.Repo.open(repoPath, function(err, repo) {
    if (err) { return cb(err); }
    repo.openIndex(function(err, index) {
      if (err) { return cb(err); }
      addFiles(index, 0, files, function(err) {
        if (err) { return cb(err); }
        index.write(function(err) {
          if (err) { return cb(err); }
          index.writeTree(function(err, oid) {
            if (err) { return cb(err); }
            ngit.Reference.oidForName(repo, 'HEAD', function(err, head) {
              var author = ngit.Signature.now(authorName, authorMail);
              var committer = ngit.Signature.now(authorName, authorMail);
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
  });
};



/**
 * create a new repository
 */
exports.createRepository = function(repoPath, files, authorName, authorMail, cb) {
  fse.mkdirpSync(repoPath);
  ngit.Repo.init(repoPath, false, function(err) {
    if (err) { return cb(err); }
    exports.commit(repoPath, files, 'first commit', authorName, authorMail, function(err, commitId) {
      cb(err, commitId);
    });
  });
};



/**
 * make commit on initial clone
 */
exports.initClonedRepo = function(repoPath, files, authorName, authorMail, cb) {
  exports.commit(repoPath, files, 'first commit', authorName, authorMail, function(err, commitId) {
    cb(err, commitId);
  });
};



/**
 * get a specific revision of a file
 */
exports.getFileRevision = function(repoPath, revisionId, file, cb) {
  ngit.Repo.open(repoPath, function(err, repo) {
    if (err) { return cb(err); }
    repo.getCommit(revisionId, function(err, commit) {
      if (err) { return cb(err); }
      commit.getEntry(file, function(err, entry) {
        if (err) { return cb(err); }
        entry.getBlob(function(err, blob) {
          cb(err, blob.toString());
        });
      });
    });
  });
};



/**
 * list all of the available revisions in the system
 */
exports.listRevisions = function(repoPath, cb) {
  var revisions = [];

  ngit.Repo.open(repoPath, function(err, repo) {
    if (err) { return cb(err); }
    repo.getMaster(function(err, branch) {
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
      history.start();
    });
  });
};


