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
var path = require('path');
var async = require('async');
var defaultDefinitions = [{
  "require": "blank-container",
  "type": "blank-container"
}, {
  "require": "docker-container",
  "type": "docker"
}, {
  "require": "process-container",
  "type": "process"
}, {
  "require": "aws-elb-container",
  "type": "aws-elb"
}, {
  "require": "aws-sg-container",
  "type": "aws-sg"
}, {
  "require": "aws-ami-container",
  "type": "aws-ami"
}];

module.exports = function(config, logger) {
  // this is setted up to leak memory over time
  // we are allocating a new container object for each system
  // that is deployed. However adding system is almost a
  // once-per-installation operation
  var containers = {};

  // we need a default
  config.containers = config.containers || [];

  function getSystemContainers(system) {
    if (!containers[system.id]) {
      containers[system.id] = {};
    }

    return containers[system.id];
  }

  function getDefinition(type) {
    var def = _.find(config.containers, function(def) { return def.type === type });
    if (!def) {
      def = _.find(defaultDefinitions, function(def) { return def.type === type });
      def.specific = def.specific || {};
    }

    return def;
  }

  function applyDefaults(def) {
    [ 'root',
      'systemsRoot',
      'buildRoot',
      'targetRoot',
      'mode',
      'region',
      'sshKeyPath',
      'identityFile',
      'accessKeyId',
      'secretAccessKey' ].forEach(function(key) {
        def.specific[key] = def.specific[key] || config.kernel[key];
      });
  }

  function buildHandler(type) {
    var def = getDefinition(type);
    var childLogger = logger.child({ module: def.type });

    if (!def) {
      throw new Error('no such definition ' + type);
    }

    applyDefaults(def);

    childLogger.debug('requiring');

    return require(def.require)(def.specific, childLogger);
  }

  function getHandler(system, type) {
    var containers = getSystemContainers(system);
    var definition;
    var childLogger;

    if (!containers[type]) {
      containers[type] = buildHandler(type);
    }

    return containers[type];
  }

  function startService(type, cb) {
    var instance = buildHandler(type);
    if (instance.service) {
      instance.service(path.resolve(path.join(config.kernel.systemsRoot, '..')), cb);
    } else {
      cb();
    }
  }

  function listTypes() {
    return _.chain(config.containers)
            .map(function(def) { return def.type })
            .concat(_.map(defaultDefinitions, function(def) { return def.type }))
            .uniq()
            .value();
  }

  function startAllServices(cb) {
    var types = listTypes();
    async.map(types, startService, cb);
  }

  return {
    getHandler: getHandler,
    listTypes: listTypes,
    startAllServices: startAllServices
  };
};
