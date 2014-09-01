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

var _ = require('underscore');
var logger = require('bunyan').createLogger({ name: 'nfd-kernel' });


var checkRequiredModule = function(config, name, cb) {
  var err = 'missing required module - ' + name;

  if (!(config.modules && config.modules[name] && config.modules[name].require)) {
    logger.error(err);
    cb(err);
    return false;
  }
  else {
    return true;
  }
};



var validateContainer = function(config, containerJson, container, cb) {
  var required = ['build', 'deploy', 'start', 'stop', 'link', 'unlink', 'undeploy'];
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
};



/**
 * boot and run the kernel
 */
exports.boot = function(config, cb) {
  var _analyzer;
  var _srv;
  var _auth;
  var _anl;
  var _api;
  var _containers = {};
  var _sr = require('./sysrev/sysrev')(config.kernel);
  var stat = false;

  _sr.boot(function(err) {
    if (err) { logger.error(err); return cb(err); }

    logger.info('loading protocol module');
    stat = checkRequiredModule(config, 'protocol', cb);
    if (stat) {
      _srv = require(config.modules.protocol.require)(config.modules.protocol.specific);
    }

    logger.info('loading authorization module');
    stat = checkRequiredModule(config, 'authorization', cb);
    if (stat) {
      _auth = require(config.modules.authorization.require)(config.modules.authorization.specific);
    }

    logger.info('loading analysis module');
    stat = checkRequiredModule(config, 'analysis', cb);
    if (stat) {
      _anl = require(config.modules.analysis.require);
      _analyzer = require('./analyzer')(_anl);
    }

    logger.info('loading containers');
    if (stat) {
      _.each(config.containers, function(container) {
        logger.info(container.require);
        container.specific.systemsRoot = config.kernel.systemsRoot;
        container.specific.buildRoot = config.kernel.buildRoot;
        container.specific.targetRoot = config.kernel.targetRoot;
        container.specific.mode = config.kernel.mode;
        container.specific.region = config.kernel.region;
        container.specific.sshKeyPath = config.kernel.sshKeyPath;
        _containers[container.type] = require(container.require)(container.specific);
        if (!validateContainer(config, container, _containers[container.type], cb)) {
          return;
        }
      });
    }

    if (stat) {
      if (!config.test) {
        _api = require('../lib/api')(config, _sr, _analyzer, _containers);
        logger.info('starting operations');
        _srv.start(_api, _auth, logger);
      }
      else {
        logger.info('done test, exiting');
        cb();
      }
    }
  });
};

