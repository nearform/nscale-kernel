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

var executor = require('../../../util/executor');
//var client = require('scp2');
//var fs = require('fs');



/**
 * deploy commands for demo
 */
module.exports = function() {


  var copy = function(host, user, keyPath, sourcePath, targetPath, out, cb) {
    console.log('scp -i ' + keyPath + ' ' + sourcePath + ' ' + user + '@' + host + ':' + targetPath, '/home/ubuntu');
    executor.exec('scp -i ' + keyPath + ' ' + sourcePath + ' ' + user + '@' + host + ':' + targetPath, '/home/ubuntu', out, function() {
      cb();
    });
  };


  /*
   * node scp2 module is very slow to copy
   *
  var copy = function(host, user, keyPath, sourcePath, targetPath, cb) {
    var key = fs.readFileSync(keyPath, 'utf8');
    console.log(key);

    client.defaults({port: 22, host: host, username: user, privateKey: key});
    console.log('host: ' + host + ' source: ' + sourcePath + ' target: ' + targetPath);
    console.log('key: ' + keyPath);
    client.scp(sourcePath, {host: host, username: user, privateKey: key, path: targetPath}, function(err) {
    //client.scp(sourcePath, {path: targetPath}, function(err) {
      cb(err);
    });
  };
  */



  return {
    copy: copy
  };
};

