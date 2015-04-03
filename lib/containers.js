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
var crypto = require('crypto');
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
}, {
  "require": "aws-autoscaling-container",
  "type": "aws-autoscaling"
}];

module.exports = function(loadConfig, logger, sr) {
  // this is setted up to leak memory over time
  // we are allocating a new container object for each system
  // that is deployed. However adding system is almost a
  // once-per-installation operation
  var containers = {};
  var digests = {};
  var services = {};

  function getContainers(config, system, cb) {

    delete config.logger;

    var shasum = crypto.createHash('sha1');
    shasum.update(JSON.stringify(config));
    var digest = shasum.digest('hex');
    var toDelete;

    // clean up old containers for this system
    // as the config changed
    if (digests[system.id] !== digest && containers[system.id]) {
      toDelete = containers[system.id];
      delete containers[system.id];

      return async.eachSeries(Object.keys(toDelete), function(key, cb) {
        if (toDelete[key].release) {
          return toDelete[key].release(cb);
        }
        cb();
      }, complete);
    }

    return complete();

    function complete(err) {
      if (err) {
        return cb(err);
      }

      // we need a default
      config.containers = config.containers || [];

      if (!containers[system.id]) {
        containers[system.id] = {};
      }

      digests[system.id] = digest;
      cb(null, containers[system.id]);
    }
  }

  function getDefinition(config, type) {
    var def = _.find(config.containers, function(def) { return def.type === type });

    if (!def) {
      def = _.find(defaultDefinitions, function(def) { return def.type === type });
    }

    if (def) {
      def.specific = def.specific || {};
    }

    return def;
  }

  function applyDefaults(config, def) {
    [ 'root',
      'systemsRoot',
      'buildRoot',
      'targetRoot',
      'mode',
      'region',
      'sshKeyPath',
      'identityFile',
      'accessKeyId',
      'secretAccessKey',
      'defaultSubnetId',
      'defaultVpcId',
      'defaultImageId',
      'tagAppend',
      'defaultInstanceType' ].forEach(function(key) {
        def.specific[key] = config[key] || config.kernel[key] || def.specific[key];
      });
  }

  function buildHandler(config, type) {
    var def = getDefinition(config, type);
    var childLogger = logger.child({ module: def.type });

    if (!def) {
      throw new Error('no such definition ' + type);
    }

    applyDefaults(config, def);
    def.specific.startedService = services[type];

    childLogger.debug('requiring');

    return require(def.require)(def.specific, childLogger);
  }

  function getHandler(system, type, cb) {
    loadConfig(system, function(err, config) {
      if (err) { return cb(err); }

      getContainers(config, system, function(err, containers) {
        if (err) { return cb(err); }

        var definition;
        var childLogger;

        if (!containers[type]) {
          containers[type] = buildHandler(config, type);
        }

        cb(null, containers[type]);
      });
    });
  }

  function startService(config, api, sr, type, cb) {
    var instance = buildHandler(config, type);
    var root = path.resolve(path.join(config.kernel.systemsRoot, '..'));
    if (instance.service) {
      logger.debug({ module: type }, 'starting');
      if (instance.service.length == 2) {
        instance.service(root, finish);
      } else if (instance.service.length == 3) {
        instance.service(root, api, finish);
      } else if (instance.service.length == 4) {
        instance.service(root, api, sr, finish);
      } else if (instance.service.length == 5) {
        instance.service(root, api, sr, loadConfig, finish);
      }
    } else {
      cb();
    }

    function finish(err, server) {
      if (server) {
        server.type = type;
      }
      cb(err, server);
    }
  }

  function listTypes(config) {
    return _.chain(config.containers || [])
            .map(function(def) { return def.type })
            .concat(_.map(defaultDefinitions, function(def) { return def.type }))
            .uniq()
            .value();
  }

  function startAllServices(config, api, sr, cb) {
    var types = listTypes(config);
    async.map(types, startService.bind(null, config, api, sr), function(err, servers) {
      services = _.chain(servers).compact().indexBy('type').value();
      cb(err, servers);
    });
  }

  return {
    getHandler: getHandler,
    listTypes: listTypes,
    startAllServices: startAllServices
  };
};
