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
var bunyan = require('bunyan');
var path = require('path');



/**
 * create a kernel instance
 */
module.exports = function(config, cb) {
  var _analyzer;
  var _srv;
  var _auth;
  var _api;
  var _containers = {};
  var logger = config.logger || bunyan.createLogger(_.merge({ name: 'nfd-kernel' }, config.kernel.logger));
  var _sr = require('./sysrev/sysrev')(config.kernel, logger);
  var stat = false;

  config.logger = logger;

  logger.info('booting');

  function setDefault(dest, source, key) {
    dest.specific[key] = dest.specific[key] || source.kernel[key]
  }

  function checkRequiredModule(name, cb) {
    var err = 'missing required module - ' + name;

    if (!(config.modules && config.modules[name] && config.modules[name].require)) {
      logger.error(err);
      cb(err);
      return false;
    }
    else {
      return true;
    }
  }

  function validateContainer(containerJson, container, cb) {
    var required = ['deploy', 'start', 'stop', 'link', 'unlink', 'undeploy', 'add', 'remove'];
    var err = 'invalid container: ' + containerJson.require + ' ';
    var stat = true;

    _.each(required, function(req) {
      if (!container[req]) {
        err += ' missing: ' + req;
        stat = false;
      }
    });

    if (!stat) {
      logger.error(err);
      cb(err);
    }

    return stat;
  }

  function start() {
    logger.info('starting operations');
    _srv.start(_api, _auth, logger);
  }

  function stop() {
    logger.info('stopping operations');
    _srv.stop();
  }

  _sr.boot(function(err) {
    if (err) { logger.error(err); return cb(err); }

    logger.debug('loading protocol module');
    stat = checkRequiredModule('protocol', cb);
    if (stat) {
      _srv = require(config.modules.protocol.require)(config.modules.protocol.specific);
    }

    logger.debug('loading authorization module');
    stat = checkRequiredModule('authorization', cb);
    if (stat) {
      _auth = require(config.modules.authorization.require)(config.modules.authorization.specific);
    }

    logger.debug('loading analysis module');
    stat = checkRequiredModule('analysis', cb);
    if (stat) {
      var anCfg = config.modules.analysis;
      if (!anCfg.specific) {
        anCfg.specific = {};
        return cb(new Error('Missing specific block for analyzer'));
      }

      setDefault(anCfg, config, 'user');
      setDefault(anCfg, config, 'identityFile');
      setDefault(anCfg, config, 'region');
      setDefault(anCfg, config, 'accessKeyId');
      setDefault(anCfg, config, 'secretAccessKey');
      _analyzer = require(config.modules.analysis.require);
    }

    logger.debug('loading containers');
    _.each(config.containers, function(container) {
      var childLogger = logger.child({ module: container.type });
      childLogger.debug('requiring');
      setDefault(container, config, 'systemsRoot');
      setDefault(container, config, 'buildRoot');
      setDefault(container, config, 'targetRoot');
      setDefault(container, config, 'mode');
      setDefault(container, config, 'region');
      setDefault(container, config, 'sshKeyPath');
      setDefault(container, config, 'identityFile');
      setDefault(container, config, 'accessKeyId');
      setDefault(container, config, 'secretAccessKey');
      _containers[container.type] = require(container.require)(container.specific, childLogger);
      if (!validateContainer(container, _containers[container.type], cb)) {
        return cb(new Error('Invalid container: ' + container.type));
      }
      if (_containers[container.type].service) {
        _containers[container.type].service(path.resolve(path.join(config.kernel.systemsRoot, '..')), function(err, server) {
          _containers[container.type].server = server;
        })
      }
    });

    _api = require('../lib/api')(config, _sr, _analyzer, _containers);
    cb();
  });

  return {
    start: start,
    stop: stop
  };
};

