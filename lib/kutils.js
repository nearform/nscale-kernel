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



exports.parseGitUrl = function parseGitUrl(url) {
  var rpath;
  var reSsh = /([a-zA-Z0-9_.-]+)\@([a-zA-Z0-9_.-]+):[a-zA-Z0-9_.-]+\/([a-zA-Z0-9_.-]+)\.git/i;
  //var reSsh = /.*?\/(.*?)\.git/i;
  var reHttp = /http[s]:\/\/([a-zA-Z0-9_.-]+)\/[a-zA-Z0-9_.-]+\/([a-zA-Z0-9_.-]+)/i;
  var result;

  if (url.indexOf('http') === 0) {
    rpath = reHttp.exec(url);
    result = {user: 'git', host: rpath[1], repo: rpath[2]};
  }
  else {
    rpath = reSsh.exec(url);
    result = {user: rpath[1], host: rpath[2], repo: rpath[3]};
  }
  return result;
};



exports.checkGitUrl = function checkGitUrl(url) {
  var reSsh = /([a-zA-Z0-9_.-]+)\@([a-zA-Z0-9_.-]+):[a-zA-Z0-9_.-]+\/([a-zA-Z0-9_.-]+)\.git/i;
  var reHttp = /http[s]:\/\/([a-zA-Z0-9_.-]+)\/[a-zA-Z0-9_.-]+\/([a-zA-Z0-9_.-]+)/i;

  if (url.indexOf('http') === 0) {
    return reHttp.test(url);
  }
  else {
    return reSsh.test(url);
  }
};

