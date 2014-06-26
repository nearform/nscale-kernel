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

var planner = require('nfd-planner');
var deployer = require('../../../lib/topology/deploy/deployer')();
var connection = { write: function(str) { console.log(str); } };
var out = require('../../../../nfd-protocol/lib/networkOut')(connection, null);



describe('config test', function() {

  beforeEach(function(done) {
    done();
  });



  afterEach(function(done) {
    done();
  });



  /*
  it('should create a plan and commands to deploy an updated container', function(done){
    this.timeout(10000000);
    var before = require('./data/sys1/sysbase.json');
    var after = require('./data/sys1/builtContainer.json');

    var plan = planner(before.system, after.system);
    console.log(plan);
    deployer.deployPlan(before, after, plan, 'preview', out, function(err) {
      console.log('--------------------');
      console.log(out.operations());
      console.log('--------------------');
      done();
    });
  });
  */



  it('should create a plan and commands to spin up a fresh AMI', function(done){
    this.timeout(10000000);
    var before = require('./data/sys1/sysbase.json');
    var after = require('./data/sys1/addedMachine.json');

    var plan = planner(before.system, after.system);
    console.log(plan);
    deployer.deployPlan(before, after, plan, 'preview', out, function(err) {
      console.log('--------------------');
      console.log(out.operations());
      console.log('--------------------');
      done();
    });
  });


  /*
  it('should create a plan and commands to move a container', function(done){
    done();
  });



  it('should create a plan and commands for first time deployment', function(done){
    done();
  });



  it('should create a plan and commands for a complex change', function(done){
    done();
  });
  */
});


