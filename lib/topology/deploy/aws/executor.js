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
var ssh = require('./sshexec');
var scp = require('./sshcp');
var DEFAULT_USER = 'ubuntu';
var MKDIR = 'mkdir -p /home/ubuntu/containers';
var IMPORT = 'sudo cat __BINARY__ | sudo docker import - __TARGETNAME__';


/**
 * deploy commands for demo
 */
module.exports = function(options) {



  /**
   * ensure builds folder is present
   * copy the binary accross
   * execute docker import
   */
  var add = function(targetHost, system, containerDef, out, cb) {
    ssh.exec(targetHost, DEFAULT_USER, system.sshKeyPath, 'mkdir -p /home/ubuntu/containers', function(err) {
      if (err) { return cb(err); }
      var bin = containerDef.specific.binary.split('/');
      scp(targetHost, DEFAULT_USER, system.sshKeyPath, containerDef.specific.binary, '/home/ubuntu/containers/' + bin[bin.length - 1], function(err) {
        var importCommand = IMPORT.replace('__BINARY__', '/home/ubuntu/containers/' + bin[bin.length - 1]);
        importCommand = importCommand.replace('__TARGETNAME__', bin[bin.length - 1]);
        ssh.exec(targetHost, DEFAULT_USER, system.sshKeyPath, importCommand, function(err) {
          cb(err);
        });
      });
    });
  };



  var start = function() {
  };



  var link = function() {
  };



  var unlink = function() {
  };



  var stop = function() {
  };



  var remove = function() {
  };



  var construct = function() {
  };



  construct();
  return {
    add: add,
    start: start,
    link: link,
    unlink: unlink,
    stop: stop,
    remove: remove
  };
};

