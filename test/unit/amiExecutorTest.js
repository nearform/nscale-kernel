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

var executor = require('../../lib/topology/deploy/executor/aws/amiExecutor')();
var connection = { write: function(str) { console.log(str); } };
var out = require('../../../nfd-protocol/lib/networkOut')(connection, null);

var TARGET_HOST = null;

var amiContainerDef = {'name': 'Machine',
                       'type': 'aws-ami',
                       'specific': {
                         'amiid': 'ami-139c5f64',
                         'repositoryToken': '04551b154404a852e663aba4c3fa299e04f6e8a5',
                         'securityGroupIds': ['sg-8daf81fa'],
                         'instanceType': 'm1.small'
                        },
                       'id': '74c88a1d-95c9-4374-8490-3c3dc318688b'};
var container = {'20': {'id': '20',
                        'containerDefinitionId': '74c88a1d-95c9-4374-8490-3c3dc318688b',
                        'containedBy': '10',
                        'contains': [ '109bcbe2-ce9e-4aeb-80a4-7bc464d0af55' ],
                        'specific': { 'ipaddress': '10.74.143.152' }}};
var system = { keyName: 'fred' };



describe('ami executor test', function() {

  beforeEach(function(done) {
    done();
  });



  afterEach(function(done) {
    done();
  });



  it('should spin up an instance', function(done){
    this.timeout(10000000);
    executor.start(TARGET_HOST, system, amiContainerDef, container, out, function(err, instances) {
      console.log(err);
      console.log(instances);
      done();
    });
  });
});


