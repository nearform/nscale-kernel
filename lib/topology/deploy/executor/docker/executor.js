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

var ssh = require('./sshexec')();
var scp = require('./sshcp')();
var DEFAULT_USER = 'ubuntu';
var IMPORT = 'sudo cat __BINARY__ | sudo docker import - __TARGETNAME__';
//var STOP = 'sudo docker stop $(sudo docker ps | grep __TARGETNAME__ | awk \'{print $1}\')';
var KILL = 'sudo docker kill $(sudo docker ps | grep __TARGETNAME__ | awk \'{print $1}\')';
var RUN = 'sudo docker run __ARGUMENTS__';
//var REMOVE = 'sudo docker rmi __TARGETNAME__';
var DELETE_UNTAGGED_CONGTAINERS = 'sudo docker ps -a -notrunc | grep \'Exit\' | awk \'{print $1}\' | xargs -r sudo docker rm';
var DELETE_UNTAGGED_IMAGES = 'sudo docker images -notrunc| grep none | awk \'{print $3}\' | xargs -r sudo docker rmi';


/**
 * deploy commands for demo - docker only
 */
module.exports = function() {



  var nameFromBin = function(container) {
    var name = null;

    if (container.specific && container.specific.containerBinary) {
      var bin = container.specific.containerBinary.split('/');
      name = bin[bin.length - 1];
    }
    return name;
  };



  var add = function(targetHost, system, containerDef, container, out, cb) {
    console.log('ADD!');

    ssh.exec(targetHost.ipaddress, DEFAULT_USER, system.sshKeyPath, 'mkdir -p /home/ubuntu/containers', function(err) {
      if (err) { return cb(err); }
      var name = nameFromBin(container);

      ssh.exec(targetHost.ipaddress, DEFAULT_USER, system.sshKeyPath, '[ ! -f /home/ubuntu/containers/' + name + ' ] && echo "notfound"', function(err, response) {
        if (err) { return cb(err); }
        if ('notfound' === response) {
          scp.copy(targetHost.ipaddress, DEFAULT_USER, system.sshKeyPath, container.specific.containerBinary, '/home/ubuntu/containers/' + name, out, function(err) {
            if (err) { return cb(err); }
            var importCommand = IMPORT.replace('__BINARY__', '/home/ubuntu/containers/' + name);
            importCommand = importCommand.replace('__TARGETNAME__', name);
            ssh.exec(targetHost.ipaddress, DEFAULT_USER, system.sshKeyPath, importCommand, function(err) {
              setTimeout(function() { cb(err); }, 10000);
            });
          });
        }
        else {
          ssh.exec(targetHost.ipaddress, DEFAULT_USER, system.sshKeyPath, 'sudo docker images', function(err, images) {
            if (err) { return cb(err); }
            var re = new RegExp(name, ['g']);
            if (!re.test(images)) {
              var importCommand = IMPORT.replace('__BINARY__', '/home/ubuntu/containers/' + name);
              importCommand = importCommand.replace('__TARGETNAME__', name);
              ssh.exec(targetHost.ipaddress, DEFAULT_USER, system.sshKeyPath, importCommand, function(err) {
                setTimeout(function() { cb(err); }, 10000);
              });
            }
            else {
              cb(err);
            }
          });
        }
      });
    });
  };



  var start = function(targetHost, system, containerDef, container, out, cb) {
    var name = nameFromBin(container);
    var startCmd = RUN.replace('__ARGUMENTS__', containerDef.specific.arguments);
    startCmd = startCmd.replace(/__TARGETNAME__/g, name);
    ssh.exec(targetHost.ipaddress, DEFAULT_USER, system.sshKeyPath, startCmd, function(err) {
      cb(err);
    });
  };



  var link = function(targetHost, system, containerDef, container, out, cb) {
    cb();
  };



  var unlink = function(targetHost, system, containerDef, container, out, cb) {
    cb();
  };



  var stop = function(targetHost, system, containerDef, container, out, cb) {
    var name = nameFromBin(container);
    if (name) {
      var stopCmd = KILL.replace('__TARGETNAME__', name);
      ssh.exec(targetHost.ipaddress, DEFAULT_USER, system.sshKeyPath, stopCmd, function(err) {
        cb(err);
      });
    }
    else {
      cb();
    }
  };



  var remove = function(targetHost, system, containerDef, container, out, cb) {
    //var name = nameFromBin(container);

    ssh.exec(targetHost.ipaddress, DEFAULT_USER, system.sshKeyPath, DELETE_UNTAGGED_CONGTAINERS, function() {
      ssh.exec(targetHost.ipaddress, DEFAULT_USER, system.sshKeyPath, DELETE_UNTAGGED_IMAGES, function() {
        // for demo leave containers note that replace this wil history of last 5 deployed containers
        // for fast rollback / forward
        cb();
        /*
        if (name) {
          var removeCmd = REMOVE.replace('__TARGETNAME__', name);
          ssh.exec(targetHost.ipaddress, DEFAULT_USER, system.sshKeyPath, removeCmd, function(err) {
            cb(err);
          });
        }
        else {
          cb();
        }
        */
      });
    });
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

