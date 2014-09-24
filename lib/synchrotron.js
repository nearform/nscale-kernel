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



/**
 * sync code and assets
 */
module.exports = function(options) {

  var userAndHost = function(url) {
    if (url.indexOf('github.com') !== -1) {
      return {user: 'git', host: 'github.com'};
    }
    return {user: null, host:null};
  };


  /**
   * sync the container source code and assets
   */
  var synch = function(system, containerDef, out, cb) {
    var root = options.kernel.buildRoot + '/' + system.namespace;
    var re = /.*?\/(.*?)\.git/i;
    var rpath = re.exec(containerDef.specific.repositoryUrl);
    var cmd;
    var path;
    var uh = userAndHost(containerDef.specific.repositoryUrl);
    //var targetPath = paths.generateTargetPath(system, options, containerDef);

    out.stdout('synchronizing repository...', 'info');
    wrench.mkdirSyncRecursive(root, 511);

    if (fs.existsSync(root + '/' + rpath[1])) {
      cmd = 'git pull';
      path = root + '/' + rpath[1];
    }
    else {
      cmd = 'git clone ' + containerDef.specific.repositoryUrl;
      path = root;
    }

    if (uh.user) {
      sshCheck.check(uh.host, uh.user, options.sshKeyPath, out, function(err) {
        if (err) { return cb(err); }
        executor.exec('live', cmd, path, out, function(err) {
          cb(err);
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

