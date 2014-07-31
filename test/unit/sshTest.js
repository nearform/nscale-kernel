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

var ssh = require('../../lib/topology/deploy/aws/sshexec')();



describe('ssh test', function() {

  beforeEach(function(done) {
    done();
  });



  afterEach(function(done) {
    done();
  });



  /*
  it('should test if a file exists on a remote system', function(done){
    this.timeout(1000000);
    ssh.exec('10.74.143.152', 'ubuntu', '/home/ubuntu/nfd.pem', '[ ! -f /home/ubuntu/.profile ] && echo "notfound"', function(err, response) {
      console.log(err);
      console.log('----> ' + response);
      done();
    });
  });
  */



  it('should test if a contianer is available on a system', function(done){
    this.timeout(1000000);
    ssh.exec('10.74.143.152', 'ubuntu', '/home/ubuntu/nfd.pem', 'sudo docker images', function(err, response) {
      console.log(err);
      console.log('----> ' + response);
      if (/web-211/g.test(response)) {
        console.log('++++ FOUND ++++');
      }
      done();
    });
  });
});


