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

var compiler = require('nscale-compiler')();
var _ = require('lodash');


// unit test for this...

module.exports = function(logger) {

  var toCopy = ['buildHead', 'binary', 'dockerImageId'];
  var defaults = [{type: 'docker', key: 'buildHead', value: 1}];



  var copySpecific = function(current, system) { 
    _.each(system.containerDefinitions, function(sysCdef) {

      var currentCdef = _.find(current.containerDefinitions, function(cd) { return cd.id === sysCdef.id; });
      if (currentCdef && currentCdef.specific && sysCdef.specific) {
        _.each(_.keys(currentCdef.specific), function(key) {
          if (_.find(toCopy, function(tc) { return tc === key; })) {
            sysCdef.specific[key] = currentCdef.specific[key];
          }
        });
      }

      _.each(system.topology.containers, function(container) {
        var matched = _.find(current.topology.containers, function(c) { return c.containerDefinitionId === container.containerDefinitionId; });
        if (matched) {
          _.merge(matched.specific, container.specific);
          _.merge(container.specific, matched.specific);
          if (matched.nativeId) {
            container.nativeId = matched.nativeId;
          }
        }
      });
    });
  };



  var setDefaults = function(current, system) {
    _.each(system.containerDefinitions, function(sysCdef) {
      _.each(defaults, function(def) {
        if (sysCdef.type === def.type && sysCdef.specific && !sysCdef.specific[def.key]) {
          sysCdef.specific[def.key] = def.value;
        }
      });
    });
  };



  var compile = function compile(current, path, platform, out, cb) {
    compiler.compile(path, platform, function(err, system) {
      if (err) { logger.error(err); out.stderr(err); return(err); }
      copySpecific(current, system);
      setDefaults(current, system);
      cb(err, system);
    });
  };


  return {
    compile: compile
  };
};


module.exports(null);

