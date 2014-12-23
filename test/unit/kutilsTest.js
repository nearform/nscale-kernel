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

var assert = require('assert');
var ku = require('../../lib/kutils');



describe('kernel utils test', function() {
  describe('parseGitUrl', function() {

    var result;
    var url;

    it('should handle well formed git urls without a dash', function(){
      url = 'git@github.com:nearform/nscalekernel.git';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'git');
      assert(result.host === 'github.com');
      assert(result.repo === 'nscalekernel');
      assert(result.branch === 'master');
    });

    it('should https url without a dash', function(){
      var url = 'https://github.com/nearform/nscalekernel';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'git');
      assert(result.host === 'github.com');
      assert(result.repo === 'nscalekernel');
      assert(result.branch === 'master');
    });

    it('should parse git url with a dash', function() {
      var url = 'git@github.com:nearform/nscale-kernel.git';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'git');
      assert(result.host === 'github.com');
      assert(result.repo === 'nscale-kernel');
      assert(result.branch === 'master');
    });

    it('should https url with a dash', function(){
      var url = 'https://github.com/nearform/nscale-kernel';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'git');
      assert(result.host === 'github.com');
      assert(result.repo === 'nscale-kernel');
      assert(result.branch === 'master');
    });

    it('should https url with .git at the end', function(){
      var url = 'https://github.com/nearform/nscale-kernel.git';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'git');
      assert(result.host === 'github.com');
      assert(result.repo === 'nscale-kernel');
      assert(result.branch === 'master');
    });

    it('should https url with a branch at the end', function(){
      var url = 'https://github.com/nearform/nscale-kernel.git#develop';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'git');
      assert(result.host === 'github.com');
      assert(result.repo === 'nscale-kernel');
      assert(result.branch === 'develop');
    });

    it('should handle well formed git urls with a branch at the end', function(){
      url = 'git@github.com:nearform/nscalekernel.git#develop';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'git');
      assert(result.host === 'github.com');
      assert(result.repo === 'nscalekernel');
      assert(result.branch === 'develop');
    });
  });
});


