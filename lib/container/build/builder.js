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

var assert = require('assert');
var executor = require('../../util/executor');
var paths = require('../../util/paths');



/**
 * container abstraction
 */
module.exports = function(options) {
  assert(options);
  var _builderMap;



  /**
   * build the container and its children
   *
   * create a target folder
   * execute the target specific build steps using the container references in _impl
   */
  var build = function(system, containerDef, out, cb) {
//    var root = options.buildRoot + '/' + system.namespace;
    var path = paths.generateTargetPath(system, options, containerDef);
      
    out.stdout('running build...', 'info');
    out.stdout(path);
    out.stdout(containerDef.specific.buildScript);
    executor.exec('sh ./' + containerDef.specific.buildScript, path, out, function(err, targetPath) {
      out.stdout('running container build...');
      _builderMap[containerDef.type].build(system, containerDef, targetPath, out, function(err, specific) {
        cb(err, specific);
      });
    });
  };



  var construct = function() {
    _builderMap = {'aws-sg': './aws/sgContainer',
                   'aws-ami': './aws/instanceContainer',
                   'docker': require('./docker/dockerBuilder')(options)};
  };



  construct();
  return {
    build: build,
  };
};

