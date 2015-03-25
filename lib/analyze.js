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
var analyzers = [
  'nscale-aws-analyzer',
  'nscale-direct-analyzer',
  'nscale-local-analyzer'
];
var toCopy = [
  'user',
  'identityFile',
  'region',
  'accessKeyId',
  'secretAccessKey'
];

// initialize require cache
analyzers.forEach(require);

module.exports = function(loadConfig, logger) {

  /**
   * Load the analyzer and returns it
   */
  function analyze(system, cb) {
    loadConfig(system, function(err, config) {
      if (err) { return cb(err); }

      var analyzerConfig = config.modules && config.modules.analysis || { specific: {} };
      var analyzer;
      var toRequire;

      if (!analyzerConfig.specific) {
        return cb(new Error('Missing specific block for analyzer'));
      }

      toCopy.forEach(function(key) {
        analyzerConfig.specific[key] = analyzerConfig.specific[key] ||
                                       config[key] || // this comes first for backward compatibility
                                       config.kernel[key];
      });

      if (config.modules && config.modules.analysis && config.modules.analysis.require) {
        toRequire = config.modules.analysis.require;
      }

      if (toRequire) {
        try {
          analyzer = require(toRequire);
        } catch(err) {
          return cb(err);
        }
      } else {
        analyzer = analyzers.reduce(function(acc, name) {
          if (acc) {
            return acc;
          }

          var analyzer = require(name);
          var canAnalyze = analyzer.canAnalyze(system);
          logger.debug({ analyzer: name, canAnalyze: canAnalyze }, 'analyzer check')
          return canAnalyze && analyzer;
        }, null);
      }

      if (!analyzer) {
        return cb(new Error('no suitable analyzer'));
      }

      analyzer.analyze(analyzerConfig.specific, system, cb);
    });
  }

  return analyze;
}
