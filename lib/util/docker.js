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

var _      = require('underscore'),
    url    = require('url'),
    Docker = require('dockerode');

/**
 * docker support functions. Must run as root
 */
module.exports = function() {
  var _docker;

  var getDocker = function() {
    if (_docker) return _docker;

    if (process.env.DOCKER_HOST) {
      var dockerHost = url.parse(process.env.DOCKER_HOST);
      var dockerOptions = {protocol:'http', host: dockerHost.hostname, port: dockerHost.port};
      _docker = new Docker(dockerOptions);
      return _docker;
    }

    _docker = new Docker({socketPath: '/var/run/docker.sock'});
    return _docker;
  };

  /**
   * find a docker image
   */
  var findImage = function(searchStr, cb) {

    getDocker().listImages(function(err, images) {
      if (err) { return cb(err); }
      var f = _.find(images, function(image) {
        return _.find(image.RepoTags, function(tag) {
          //return tag.indexOf('doc-srv-4') !== -1;
          return tag.indexOf(searchStr) !== -1;
        });
      });
      cb(err, f);
    });
  };



  return {
    findImage: findImage
  };
};


