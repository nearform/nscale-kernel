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

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

function Loader(options) {

  return function load(system, cb) {

    var root = system.repoPath;
    var file = path.join(root, 'config.js');
    var toMerge = [options];
    var target = system.topology.name;

    fs.readFile(file, function(err, script) {
      if (err) {
        // cannot read the file, just return the standard one
        return cb(null, _.clone(options));
      }

      var context = vm.createContext({
        Buffer: Buffer
      });

      vm.runInContext('var module = this; this.module = this; this.exports = {};', context);
      var script = 'var script = new Buffer("' + script.toString('base64') + '", "base64").toString();';
      vm.runInContext(script, context);
      // all this needed to support --abort_on_uncaught_exception
      var result = vm.runInContext('var res; try { res = eval(script) } catch(err) { res = { _error: err }; } res;', context);
      if (result && result._error) {
        return cb(new Error('Unable to load config: ' + result._error.message));
      }
      var config = vm.runInContext('module.exports;', context);

      cb(null, _.merge({}, options, config[target], config));
    });
  };
}


module.exports = Loader;
