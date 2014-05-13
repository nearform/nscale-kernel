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
var db = require('../../lib/db/db')({'apiPort': '8010', 'buildRoot': '/tmp/nfd', 'targetRoot': '/tmp/nfd/out', 'dbConnection': 'nfd' });



describe('config test', function() {

  beforeEach(function(done) {
    done();
  });



  afterEach(function(done) {
    done();
  });



  it('should create a system definition ', function(done) {
    var sys = require('./system.json');
    db.saveSystem(sys, function(err) {
      console.log(err);
      done();
    });
  });



  it('should list all containers in the system', function(done){
    db.listSystems(function(err, systems) {
      //console.log(JSON.stringify(systems, null, 2));
      console.log(JSON.stringify(systems));
      done();
    });
  });



  it('should load a system definition ', function(done){
    db.loadSystem('1', function(err, data) {
      //console.log(JSON.stringify(data, null, 2));
      console.log(JSON.stringify(data));
      done();
    });
  });



  it('should create a blank system', function(done){
    db.createSystem('test', 'test', function(id, err) {
      assert(!err);
      done();
    });
  });



  it('should add a container to a blank system', function(done){
    db.createSystem('test', 'test', function(id, err) {
      assert(!err);
      db.addContainer(id, 'wibble', 'docker', {}, function() {
        done();
      });
    });
  });
});



