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
var root = require('../../lib/container/root')({'apiPort': '8010', 'buildRoot': '/tmp/nfd', 'targetRoot': '/tmp/nfd/out'});
var builder = require('../../lib/container/build/builder')({'apiPort': '8010', 'buildRoot': '/tmp/nfd', 'targetRoot': '/tmp/nfd/out'});
var out = require('../../lib/util/consoleOut');

describe('config test', function() {

  beforeEach(function(done) {
    done();
  });

  afterEach(function(done) {
    done();
  });

  it('should build the nginx sample container', function(done){
    this.timeout(1000000);
    root.load(__dirname + '/../../../nfd-samples/web/nfd.json');
  
    var nginx = root.containerDefByDefId('3');
    builder.build(nginx, nginx, out, function(err, result) {
      //nginx.build(out, function(err, result) {
      console.log(err);
      console.log(result);
      assert(!err);
      done();
    });
  });

  //it('should read version', function(done) {
  //  root.load(__dirname + '/../../../nfd-samples/web/nfd.json'); 
  //  done();
  //});



  

  /*
  it('should build the example app container', function(done){
    this.timeout(1000000);
    var heriarchy = root.deserialize(__dirname + '/../../../samples/web/web.nfd.json');
    heriarchy['root']['sg-1234']['inst-1234']['node-1'].build(function(err, result) {
      console.log(err);
      console.log('-----------------');
      console.log(JSON.stringify(result));
      done();
    });
  });
  */
});


