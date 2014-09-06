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
 * command executor
 */
module.exports = function(mode) {

  var executors = {'aws-elb': './aws/elbExecutor',
                   'aws-ami': './aws/amiExecutor',
                   'docker': './docker/dockerExecutor'};



  var valid = function(executor) {
    var result = executor;

    var nop = function(/*name*/) {
      return arguments[arguments.length - 1]();
    };

    if (!executor) {
      result = {
        add: nop.bind(null, 'add'),
        start: nop.bind(null, 'start'),
        link: nop.bind(null, 'link'),
        unlink: nop.bind(null, 'unlink'),
        stop: nop.bind(null, 'stop'),
        remove: nop.bind(null, 'remove')
      };
    }
    return result;
  };



  var match = function(type) {
    var e = require(executors[type]);
    var ex = e(mode);
    return valid(ex);
  };



  return {
    match: match
  };
};


