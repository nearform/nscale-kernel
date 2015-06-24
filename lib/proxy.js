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



module.exports = function(loadConfig, _containers) {

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

          targetProxies = determineTargets(analyzed);
          async.eachSeries(targetProxies, function(targetProxy, next) {
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

              if (analyzed.topology.containers[targetProxy.container.containedBy] && analyzed.topology.containers[targetProxy.container.containedBy].specific) {
                impl.hup(mode, analyzed.topology.containers[targetProxy.container.containedBy].specific, system, targetProxy.containerDef, targetProxy.container, haConfig, out, function(err) {
                  if (err) { return next(err); }
                  next();
                });
              }
              else {
                cb(new Error('no specific block available for hup'));
              }
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

