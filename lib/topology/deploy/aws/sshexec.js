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

var Connection = require('ssh2');


/**
 * ssh remote execute command
 */
module.exports = function() {


  var exec = function(host, user, keyPath, command, cb) {
    var c = new Connection();
    var response = '';
    c.on('ready', function() {
      c.exec(command, function(err, stream) {
        if (err) { return cb(err); }
        stream.on('data', function(data) {
          //console.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ') + data);
          response += data;
        });
        stream.on('end', function() {
        });
        stream.on('close', function() {
        });
        stream.on('exit', function() {
          c.end();
        });
      });
    });
    c.on('error', function(err) {
      cb(err);
    });
    c.on('end', function() {
      cb(null, response);
    });
    c.on('close', function(hadError) {
      cb(hadError);
    });
    c.connect({host: host,
               port: 22,
               username: 'frylock',
               privateKey: require('fs').readFileSync(keyPath)});
  };



  return {
    exec: exec
  };
};

