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
var executor = require('../../util/executor');



/**
 * container abstraction
 */
module.exports = function(options) {



  /**
   * sync the container source code and assets
   */
  var synch = function(system, containerDef, out, cb) {
    var root = options.buildRoot + '/' + system.namespace;
    var cmd;
    var path;

    out.stdout('synchronizing repository...', 'info');
    wrench.mkdirSyncRecursive(root, 511);

    console.log(root + '/' + containerDef.specific.path);

    if (fs.existsSync(root + '/' + containerDef.specific.path)) {
      cmd = 'git pull';
      path = root + '/' + containerDef.specific.path;
    }
    else {
      cmd = 'git clone ' + containerDef.specific.repositoryUrl;
      path = root;
    }

    executor.exec(cmd, path, out, function(err) {
      cb(err);
    });
  };



  var construct = function() {
  };



  construct();
  return {
    synch: synch
  };
};

