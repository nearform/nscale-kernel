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

var reSsh = /([a-zA-Z0-9_.\-]+)\@([a-zA-Z0-9_.\-]+):[a-zA-Z0-9_.\-]+\/([a-zA-Z0-9_.-]+)\.git(?:\#([a-zA-Z0-9_.\-\/]+))?/i;
var reHttp = /https?:\/\/(?:([a-zA-Z0-9_.\-\\%]+)(?::([a-zA-Z0-9_.\-]+))@){0,1}([a-zA-Z0-9_.\-]+)\/(?:[a-zA-Z0-9_.\-]+\/)+([a-zA-Z0-9_\-]+)(?:\.git){0,1}(?:\#([a-zA-Z0-9_.\-\/]+)){0,1}/i;
var urlencode = require('urlencode');

function fetchUserPass(repo, config) {
  if (!config || !config.repositories) {
    return;
  }

  if (config.repositories[repo]) {
    return config.repositories[repo];
  }

  if (config.repositories.user && config.repositories.password) {
    return config.repositories;
  }

  return null;
}

function addUserPassword(result, config) {
  var user;
  var password;
  var userPass;
  var url;

  if (result.type !== 'http') {
    return;
  }

  userPass = fetchUserPass(result.cloneUrl, config);

  if (!userPass) {
    return;
  }

  user = urlencode(userPass.user);
  password = urlencode(userPass.password);
  url = result.cloneUrl.replace(/https:\/\//, 'https://' + user + ':' + password  + '@');

  result.cloneUrl = url;
}

exports.parseGitUrl = function parseGitUrl(url, config) {
  var rpath;
  var result;


  if (url.indexOf('http') === 0) {
    rpath = reHttp.exec(url);
    result = {
      type: 'http',
      user: rpath[1] || 'git',
      pass: rpath[2],
      host: rpath[3],
      repo: rpath[4],
      branch: rpath[5] || 'master'
    };
  }
  else {
    rpath = reSsh.exec(url);
    result = {
      type: 'ssh',
      user: rpath[1],
      host: rpath[2],
      repo: rpath[3],
      branch: rpath[4] || 'master'
    };
  }

  result.cloneUrl = url.replace(/\#(?:[a-zA-Z0-9_.\-\/])+$/, '');

  addUserPassword(result, config);

  return result;
};



exports.checkGitUrl = function checkGitUrl(url) {
  var reSsh = /([a-zA-Z0-9_.-]+)\@([a-zA-Z0-9_.-]+):[a-zA-Z0-9_.-]+\/([a-zA-Z0-9_.-]+)\.git/i;

  if (url.indexOf('http') === 0) {
    return reHttp.test(url);
  }
  else {
    return reSsh.test(url);
  }
};
