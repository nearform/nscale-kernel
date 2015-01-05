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

var wrench = require('wrench');
var fs = require('fs');
var executor = require('nscale-util').executor();
var sshCheck = require('nscale-util').sshcheck();
var ku = require('./kutils');



/**
 * sync code and assets
 */
module.exports = function(options) {


  /**
   * sync the container source code and assets
   */
  var synch = function(system, containerDef, out, cb) {
    var uh = ku.parseGitUrl(containerDef.specific.repositoryUrl);
    var cmd;
    var path = system.repoPath + '/workspace';

    out.stdout('--> synchronizing repository...', 'info');

    if (fs.existsSync(path + '/' + uh.repo)) {
      cmd = 'git pull';
      path += '/' + uh.repo;
    }
    else {
      cmd = 'git clone ' + uh.cloneUrl;
    }

    wrench.mkdirSyncRecursive(path, 511);

    if (uh.user) {
      sshCheck.check(uh.host, uh.user, options.sshKeyPath, out, function(err) {
        if (err) { return cb(err); }
        executor.exec('live', cmd, path, out, function(err) {
          path = system.repoPath + '/workspace/' + uh.repo;

          executor.exec('live', 'git checkout ' + uh.branch, path, out, function(err) {
            cb(err);
          });
        });
      });
    }
    else {
      executor.exec('live', cmd, path, out, function(err) {
        cb(err);
      });
    }
  };



  var construct = function() {
  };



  construct();
  return {
    synch: synch
  };
};

