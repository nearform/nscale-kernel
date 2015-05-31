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
var pxy = require('nscale-proxy')();
var async = require('async');



module.exports = function(loadConfig, _containers, logger) {

  /**
   * Determine the target containers - machine containers that have a proxy on them.
   */
  var determineTargets = function(analyzed) {
    var containers = analyzed.topology.containers;
    var targets = [];

    _.each(containers, function(c) {
      if (c.containerDefinitionId.indexOf('__proxy') === 0) {
        var cdef = _.find(analyzed.containerDefinitions, function(cdef) { return cdef.id === c.containerDefinitionId; });
        targets.push({containerDef: cdef, container: c});
      }
    });
    return targets;
  };

  /*
   *
   * issue is here config file is generated OK now,
   * next need to ensure that the 
   * 1 file is copies
   * 2 proxy is hupped 
   *
   * appears to wipe the file at the moment
   *
   * must test AWS and direct before release...
   * but for demo is fine...
   *
   * need to test and get release OUT by Tuesday morning
   *
   */


  /**
   * generate a new proxy configuration, distribute to all containers and hup all
   */
  var hupAllProxies = function hupAll(mode, target, system, analyzed, out, cb) {
    var targetProxies;
    var host = 'unspecified';

    loadConfig(system, function(err, cfg) {
      if (err) { return cb(err); }
      if (cfg.enableProxy && _.find(cfg.enableProxy, function(p) { return p === target; })) {
        pxy.generate(system, analyzed, function(err, haConfig) { 
          if (err) { return cb(err); }

          console.log('----------------------------------------------------');
          console.log(haConfig);
          console.log('----------------------------------------------------');

          targetProxies = determineTargets(analyzed);
          async.eachSeries(targetProxies, function(targetProxy, next) {
            debugger;
            _containers.getHandler(system, targetProxy.containerDef.type, function(err, impl) {
              if (err) { return cb(err); }
              if (!impl) { return cb(new Error(err)); }
              if (!impl.hup) { return cb(new Error('container mismatch - no hup command')); }

              if (mode === 'preview') {
                if (analyzed.topology.containers[targetProxy.containedBy]) {
                  host = analyzed.topology.containers[targetProxy.containedBy];
                }
                out.preview({cmd: 'HUP: ' + targetProxy.containerDef.name, host: host});
              }
              console.log('============> calling HUP');

              debugger;
              impl.hup(mode, analyzed, system, targetProxy.containerDef, targetProxy.container, haConfig, out, function(err) {
                if (err) { return next(err); }
                next();
              });
            });
          }, function(err) {
            cb(err);
          });
        });
      }
      else {
        cb();
      }
    });
  };



  return {
    hupAllProxies: hupAllProxies
  };
};

