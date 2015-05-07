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
var p = require('path');



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
      var doSync = true;
      var checkoutDir = containerDef.specific.checkoutDir || uh.repo;
      var workspacePath = p.join(system.repoPath, 'workspace');
      var checkoutPath = p.join(workspacePath, checkoutDir);
      var updatePath;

      if (options.hasOwnProperty('pullOnCompile')) {
        doSync = options.pullOnCompile;
      }

      function execute() {
        executor.exec('live', updateCmd, updatePath, out, function(err) {
          if (err) { return cb(err); }

          executor.exec('live', checkoutCmd, checkoutPath, out, function(err) {
            cb(err);
          });
        });
      }

      out.stdout('--> synchronizing ' + containerDef.id, 'info');

      if (fs.existsSync(checkoutPath)) {
        updateCmd = 'git fetch';
        updatePath = checkoutPath;
        checkoutCmd += '; git pull origin ' + uh.branch;
      }
      else {
        updatePath = system.repoPath;
        updateCmd = 'git clone ' + uh.cloneUrl + ' ' + p.join('workspace', checkoutDir);
        doSync = true;
      }

      if (doSync) {
        wrench.mkdirSyncRecursive(workspacePath, 511);
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

