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
var mkdirp = require('mkdirp');


/**
 * create a kernel instance
 */
module.exports = function(config, cb) {
  var _srv;
  var _auth;
  var _api;
  var logger = config.logger || bunyan.createLogger(_.merge({ name: 'nfd-kernel' }, config.kernel.logger));
  var loadConfig = require('./configLoader')(config);
  var _containers = require('./containers')(loadConfig, logger);
  var stat = false;
  var _servers = {};

  config.logger = logger;

  logger.info('booting');

  if (config.kernel.root) {
    config.kernel.root = path.resolve(process.cwd(), config.kernel.root);
    config.kernel.systemsRoot = path.join(config.kernel.root, 'data', 'systems');
  } else {
    config.kernel.systemsRoot = path.resolve(process.cwd(), config.kernel.systemsRoot);
    config.kernel.root = path.normalize(path.join(config.kernel.systemsRoot, '..', '..'));
  }

  if (!config.kernel.logRoot) {
    config.kernel.logRoot = path.join(config.kernel.root, 'log');
    mkdirp.sync(config.kernel.logRoot);
  }

  if (!config.kernel.timelinesRoot) {
    config.kernel.timelinesRoot = path.join(config.kernel.root, 'timelines');
    mkdirp.sync(config.kernel.timelinesRoot);
  }

  var _sr = require('./sysrev/sysrev')(config.kernel, logger);

  function setDefault(dest, source, key) {
    dest.specific[key] = dest.specific[key] || source.kernel[key];
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
    _containers.stopAllServices(function(err) {
      if (err) { logger.error(err); process.exit(1); }
      process.exit(0);
    });
  }

  _sr.boot(function(err) {
    if (err) { logger.error(err); return cb(err); }

    logger.debug('loading protocol module');
    stat = checkRequiredModule('protocol', cb);
    if (stat) {
      _srv = require(config.modules.protocol.require)(config.kernel);
    }

    logger.debug('loading authorization module');
    stat = checkRequiredModule('authorization', cb);
    if (stat) {
      _auth = require(config.modules.authorization.require)(config.modules.authorization.specific);
    }

    _api = require('../lib/api')(
      config,
      loadConfig,
      logger,
      _sr,
      _containers,
      _servers);

    _containers.startAllServices(config, _api, _sr, function(err, servers) {
      if (err) { return cb(err); }

      // needed because we passed the _servers object to API
      Object.keys(servers).forEach(function(key) {
        _servers[key] = servers[key];
      });
      cb();
    });
  });

  return {
    start: start,
    stop: stop
  };
};

