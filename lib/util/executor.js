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

var exec = require('child_process').exec;



/**
 * execute a child process and push results data down callback
 */
/*
exports.buildContainer = function(params, out, cb) {
  var proc = exec(params.buildScript + ' ' + params.namespace + ' ' + params.targetPath + ' ' + params.targetName, { cwd: params.path });

  proc.stdout.on('data', function (data) {
    out.stdout(data);
  });

  proc.stderr.on('data', function (data) {
    out.stderr(data);
  });

  proc.on('close', function (code) {
    if (code !== 0) {
      out.stderr(code);
    }
    cb(code !== 0);
  });
};
*/


exports.exec = function(cmd, dir, out, cb) {
  var proc = exec(cmd, {cwd: dir});
  var targetPath;

  proc.stdout.on('data', function (data) {
    if (data.indexOf('TARGET:') !== -1) {
      targetPath = data.substr(7);
      targetPath = targetPath.trim();
    }
    out.stdout(data);
  });

  proc.stderr.on('data', function (data) {
    out.stderr(data);
  });

  proc.on('close', function (code) {
    if (code !== 0) {
      out.stderr(code);
    }
    cb(code !== 0, targetPath);
  });
};


