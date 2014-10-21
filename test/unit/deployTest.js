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
var logger = require('bunyan').createLogger({ name: 'deploy-test', level: 60 });
var Deployer = require('../../lib/deployer');
var OutMock = require('../mocks/out.js');
var sysdef = require('../data/sysdef.json');

describe('deploy test', function() {
  it('should deploy an empty plan', function(done) {
    var deployer = new Deployer({ logger: logger }, {});
    deployer.deployPlan({}, {}, [], 'live', new OutMock(logger), function(err) {
      assert(!err);
      done();
    });
  });

  it('should fail to deploy a plan with no suitable containers', function(done) {
    var deployer = new Deployer({ logger: logger }, {});
    deployer.deployPlan(sysdef, sysdef, [
      {
        id: '20',
        cmd: 'deploy',
        parent: '10'
      }
    ], 'live', new OutMock(logger), function(err) {
      assert(err);
      done();
    });
  });

  it('should call container-specific deploy function', function(done) {
    var deployCalled = false;
    var deployer = new Deployer({ logger: logger }, {
      docker: {
        deploy: function(mode, specific, target, containerDef, container, out, done) {
          deployCalled = true;
          assert.equal(mode, 'live');
          done();
        }
      }
    });

    deployer.deployPlan(sysdef, sysdef, [
      {
        id: 'c5c9ceb9-21b3-4d56-81e7-4bff829a5c45',
        cmd: 'deploy',
        parent: '10'
      }
    ], 'live', new OutMock(logger), function(err) {
      assert(!err);
      assert(deployCalled);
      done();
    });
  });
});
