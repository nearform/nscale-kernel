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
var toCopy = [
  'user',
  'identityFile',
  'region',
  'accessKeyId',
  'secretAccessKey'
];

module.exports = function(config, logger) {

  /**
   * Load the analyzer and returns it
   */
  function analyze(config, system, cb) {

    var analyzerConfig = { specific: {} } || config.modules.analysis;
    var analyzer;
    var toRequire;

    if (!analyzerConfig.specific) {
      return cb(new Error('Missing specific block for analyzer'));
    }

    toCopy.forEach(function(key) {
      analyzerConfig.specific[key] = analyzerConfig.specific[key] ||
                                     config.kernel[key] ||
                                     config[key];
    });

    if (config.modules && config.modules.analysis && config.modules.analysis.require) {
      toRequire = config.modules.analysis.require;
    }

    if (!toRequire) {
      return cb(new Error('no analyzer specified'));
    }

    try {
      analyzer = require(toRequire);
    } catch(err) {
      return cb(err);
    }

    analyzer.analyze(analyzerConfig, system, cb);
  }

  return analyze;
}
