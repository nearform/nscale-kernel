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
var logger = require('bunyan').createLogger({ name: 'build-test', level: 60 });
var root = require('../../lib/container')();
var Builder = require('../../lib/builder');
var sysDef = require('../data/sysdef.json');
var outMock = require('../mocks/out.js');

root.load(sysDef);

describe('build test', function() {

  var user = {
    name: 'Matteo Collina',
    email: 'hello@matteocollina.com'
  };

  beforeEach(function(done) {
    done();
  });

  afterEach(function(done) {
    done();
  });

  it('should fail the build if there are no suitable container types', function(done) {
    var containers = {};
    containers.getHandler = function() {
      return null;
    };
    var builder = new Builder({ logger: logger }, containers);
    var cDef = root.containerDefByDefId('222409de-150d-42fb-8151-da6b08fa7ce7');
    builder.build(user, sysDef.id, { development: sysDef }, sysDef, cDef, 'development', outMock(logger), function(err) {
      assert(err);
      done();
    });
  });

  it('should call container-specific methods', function(done){
    var buildCalled = false;

    var containers = {};
    containers.getHandler = function(system, type) {
      if (type === 'docker') {
        return {
          build: function(mode, sysDef_, cDef_, out, cb) {
            buildCalled = true;
            assert.equal(mode, 'live');
            assert.deepEqual(sysDef_, sysDef);
            assert.deepEqual(cDef_, cDef);
            cb(null);
          }
        };
      }
      return null;
    };

    var builder = new Builder({ logger: logger }, containers, {
      writeTimeline: function() {},
      writeFile: function(a, b, c, cb) {
        cb();
      },
      commitRevision: function(a, b, c, cb) {
        cb();
      },
    });

    var cDef = root.containerDefByDefId('222409de-150d-42fb-8151-da6b08fa7ce7');
    builder.build(user, sysDef.id, { development: sysDef }, sysDef, cDef, 'development', outMock(logger), function(err) {
      assert(!err);
      assert(buildCalled);
      done();
    });
  });
});
