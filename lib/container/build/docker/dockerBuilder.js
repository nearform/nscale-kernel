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
var fse = require('fs-extra');
var _ = require('underscore');
var executor = require('../../../util/executor');



/**
 * container abstraction
 */
module.exports = function() {



  /**
   * run docker specific build
   */
  var build = function(params, out, cb) {
    out.stdout('docker build...');
    var p = _.extend({}, params);
    p.buildScript = 'sh container.sh';

    fse.copy(__dirname + '/container.sh', p.path + '/container.sh', function(err){
      if (err) { return cb(err); }
      out.stdout('run build...');

      executor(p, out, function(err) {
        fse.remove(p.path + '/container.sh', function() {
          cb(err);
        });
      });
    });
  };



  /**
   * construct the builder
   */
  var construct = function() {
  };



  construct();
  return {
    build: build,
  };
};


