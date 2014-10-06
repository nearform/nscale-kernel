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

  it('should handle well formed git urls', function(done){
    var result;

    assert(ku.checkGitUrl('git@github.com:nearform/nscalekernel.git'));
    result = ku.parseGitUrl('git@github.com:nearform/nscalekernel.git');
    assert(result.user === 'git');
    assert(result.host === 'github.com');
    assert(result.repo === 'nscalekernel');

    assert(ku.checkGitUrl('https://github.com/nearform/nscalekernel'));
    result = ku.parseGitUrl('https://github.com/nearform/nscalekernel');
    assert(result.user === 'git');
    assert(result.host === 'github.com');
    assert(result.repo === 'nscalekernel');

    assert(ku.checkGitUrl('git@github.com:nearform/nscale-kernel.git'));
    assert(result.user === 'git');
    assert(result.host === 'github.com');
    assert(result.repo === 'nscalekernel');

    assert(ku.checkGitUrl('https://github.com/nearform/nscale-kernel'));
    assert(result.user === 'git');
    assert(result.host === 'github.com');
    assert(result.repo === 'nscalekernel');
    done();
  });
});


