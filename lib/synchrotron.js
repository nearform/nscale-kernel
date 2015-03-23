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
module.exports = function(loadConfig) {

  /**
   * sync the container source code and assets
   */
  var synch = function(system, containerDef, out, cb) {
    loadConfig(system, function(err, options) {
      if (err) { return cb(err); }

      var uh = ku.parseGitUrl(containerDef.specific.repositoryUrl, options);
      var updateCmd;
      var checkoutCmd = 'git checkout ' + uh.branch;
      var path = system.repoPath + '/workspace';
      var doSync = true;

      if (options.hasOwnProperty('pullOnCompile')) {
        doSync = options.pullOnCompile;
      }
      console.log('do sync => ' + doSync);


      function execute() {
        executor.exec('live', updateCmd, path, out, function(err) {
          if (err) { return cb(err); }

          path = system.repoPath + '/workspace/' + uh.repo;
          executor.exec('live', checkoutCmd, path, out, function(err) {
            cb(err);
          });
        });
      }
      out.stdout('--> synchronizing ' + containerDef.id, 'info');

      if (fs.existsSync(path + '/' + uh.repo)) {
        updateCmd = 'git fetch';
        path += '/' + uh.repo;
        checkoutCmd += '; git pull origin ' + uh.branch;
      }
      else {
        updateCmd = 'git clone ' + uh.cloneUrl;
        doSync = true;
      }

      if (doSync) {
        wrench.mkdirSyncRecursive(path, 511);
        if (uh.type === 'git') {
          sshCheck.check(uh.host, uh.user, options.sshKeyPath, out, function(err) {
            if (err) { return cb(err); }
            execute();
          });
        }
        else {
          execute();
        }
      }
      else {
        out.stdout('--> sync aborted for ' + containerDef.id + ' pullOnCompile flag set to false', 'info');
        cb();
      }
    });
  };



  return {
    synch: synch
  };
};

