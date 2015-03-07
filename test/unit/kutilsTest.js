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
      assert(result.cloneUrl === 'git@github.com:nearform/nscale-kernel.git');
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
      assert(result.cloneUrl === 'https://github.com/nearform/nscale-kernel.git');
    });

    it('should https url with a branch at the end', function(){
      var url = 'https://github.com/nearform/nscale-kernel.git#develop';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'git');
      assert(result.host === 'github.com');
      assert(result.repo === 'nscale-kernel');
      assert(result.branch === 'develop');
      assert(result.cloneUrl === 'https://github.com/nearform/nscale-kernel.git');
    });

    it('should https url with a branch with a /', function(){
      var url = 'https://github.com/nearform/nscale-kernel.git#feature/abcde';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'git');
      assert(result.host === 'github.com');
      assert(result.repo === 'nscale-kernel');
      assert(result.branch === 'feature/abcde');
    });

    it('should https url with a branch with a /', function(){
      var url = 'https://github.com/nearform/nscale-kernel.git#feature/abcde';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'git');
      assert(result.host === 'github.com');
      assert(result.repo === 'nscale-kernel');
      assert(result.branch === 'feature/abcde');
      assert(result.cloneUrl === 'https://github.com/nearform/nscale-kernel.git');
    });

    it('should https url with a branch with a / and a -', function(){
      var url = 'https://github.com/nearform/nscale-kernel.git#feature/abc-de';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'git');
      assert(result.host === 'github.com');
      assert(result.repo === 'nscale-kernel');
      assert(result.branch === 'feature/abc-de');
      assert(result.cloneUrl === 'https://github.com/nearform/nscale-kernel.git');
    });


    it('should handle well formed git urls with a branch at the end', function(){
      url = 'git@github.com:nearform/nscalekernel.git#develop';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'git');
      assert(result.host === 'github.com');
      assert(result.repo === 'nscalekernel');
      assert(result.branch === 'develop');
      assert(result.cloneUrl === 'git@github.com:nearform/nscalekernel.git');
    });

    it('should handle a branch with a / over ssh', function(){
      url = 'git@github.com:nearform/nscalekernel.git#feature/abcde';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'git');
      assert(result.host === 'github.com');
      assert(result.repo === 'nscalekernel');
      assert(result.branch === 'feature/abcde');
    });

    it('should https url with a username and a password', function(){
      var url = 'https://matteo.collina:mypass@github.com/nearform/nscale-kernel.git';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'matteo.collina');
      assert(result.pass === 'mypass');
      assert(result.host === 'github.com');
      assert(result.repo === 'nscale-kernel');
      assert(result.branch === 'master');
    });

    it('should https url with a username with a %40', function(){
      var url = 'https://matteo.collina%40nearform.com:mypass@github.com/nearform/nscale-kernel.git';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'matteo.collina%40nearform.com');
      assert(result.pass === 'mypass');
      assert(result.host === 'github.com');
      assert(result.repo === 'nscale-kernel');
      assert(result.branch === 'master');
    });

    it('should https url with multiple /', function(){
      var url = 'https://foo.com/bar/foo/bar.git';
      assert(ku.checkGitUrl(url));
      result = ku.parseGitUrl(url);
      assert(result.user === 'git');
      assert(result.host === 'foo.com');
      assert(result.repo === 'bar');
      assert(result.branch === 'master');
    });

    it('should add a generic user and passwod based on options', function(){
      var url = 'https://github.com/nearform/nscalekernel.git';
      result = ku.parseGitUrl(url, {
        repositories: {
          user: 'mcollina',
          password: 'Mypass1234'
        }
      });
      assert(result.cloneUrl === 'https://mcollina:Mypass1234@github.com/nearform/nscalekernel.git');
    });

    it('should URL-encode username and passwords', function(){
      var url = 'https://github.com/nearform/nscalekernel.git';
      result = ku.parseGitUrl(url, {
        repositories: {
          user: 'matteo.collina@nearform.com',
          password: 'Mypass1234'
        }
      });
      assert(result.cloneUrl === 'https://matteo.collina%40nearform.com:Mypass1234@github.com/nearform/nscalekernel.git');
    });

    it('should add repo-specific username and password', function(){
      var url = 'https://github.com/nearform/nscalekernel.git';
      result = ku.parseGitUrl(url, {
        repositories: {
          'https://github.com/nearform/nscalekernel.git': {
            user: 'mcollina',
            password: 'Mypass1234'
          }
        }
      });
      assert(result.cloneUrl === 'https://mcollina:Mypass1234@github.com/nearform/nscalekernel.git');
    });
  });
});


