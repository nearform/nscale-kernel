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
var uuid = require('uuid');
var wrench = require('wrench');
var executor = require('../util/executor');

var typeMap = { 'aws-sg': './aws/sgContainer',
                'aws-instance': './aws/instanceContainer',
                'docker': './common/dockerContainer' };


/**
 * container abstraction
 */
exports.create = function(system, json, options) {
  assert(json.type);
  assert(json.id);

  var _impl = null;



  /**
   * build the container and its children
   *
   * create a target folder
   *
   * execute the build script (sh build.sh)
   *
   * copy results to target container build area
   *
   *   $1 - build path
   *   $2 - target path
   *   script will place outputs into target path including result.json
   *
   * execute the target specific build steps using the container references in _impl
   */
  var build = function(out, cb) {
    var targetPath = options.targetRoot + '/' + uuid.v4();

    out.stdout('create target folder: ' + targetPath);
    wrench.mkdirSyncRecursive(targetPath, 511);
    json.targetPath = targetPath;

    out.stdout('running build...');
    out.stdout(json.build);

    executor(json, out, function(err) {
      if (err) { return cb(err); }

      out.stdout('running container build...');
      _impl.encapsulate(json, out, function(err) {
        cb(err);
      });
    });
  };



  var encapsulate = function() {
  };



  var stringify = function(depth) { 
    var prepend = '';
    for (var idx = 0; idx < depth; ++idx) {
      prepend += '  ';
    }
    var result = JSON.stringify(json, null, 2);
    result = result.replace(/^/g, prepend);
    result = result.replace(/\n/g, '\n' + prepend);
    return result;
  };



  /**
   * construct the container
   */
  var construct = function() {
    if (json.type && typeMap[json.type]) {
      _impl = require(typeMap[json.type]).create(system, json, options);
    }
    else {
      _impl = require('./nullContainer').create(system, json, options);
    }
  };



  construct();
  return {
    id: json.id,
    children: json.children,
    parent: json.parent,
    build: build,
    stringify: stringify,
    encapsulate: encapsulate
  };
};


