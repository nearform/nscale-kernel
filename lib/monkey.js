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



/**
 * chaos monkey module
 */
module.exports = function(config, interval, logger) {
  var monkey = require('nscale-chaos-monkey')(config);
  var monkeyTimer;
  var monkeySpanking = false;

  var monkeySpanker = function(analyze, user, identifier, target, out, cb) {
    analyze(user, identifier, target, out, function(err, analyzed, system) {
      monkey.eeeekEeeek(analyzed, system, out, logger, function(err) {
        cb(err);
      });
    });
  };



  var start = function(monitorRunning, analyze, user, identifier, target, out, cb) {
    logger.info('eeek eeek monkey is go');
    cb();
    monkeyTimer = setInterval(function() {
      if (monitorRunning()) { logger.info('monkey aborted, monitor running'); return; }

      monkeySpanking = true;
      logger.info('eeek eeek monkey looking for something to kill');
      monkeySpanker(analyze, user, identifier, target, out, function(err) {
        monkeySpanking = false;
        if (err) {
          logger.error('bad monkey: ' + err);
        }
      });
    }, interval);
  };



  var stop = function(cb) {
    logger.info('ook ook ook monkey stopped');
    if (monkeyTimer) {
      clearInterval(monkeyTimer);
      monkeyTimer = undefined;
    }
    cb();
  };



  var spanking = function() {
    return monkeySpanking;
  };



  return {
    start: start,
    stop: stop,
    spanking: spanking 
  };
};

