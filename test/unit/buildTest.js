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

var _ = require('lodash');
var assert = require('assert');
var logger = require('bunyan').createLogger({ name: 'build-test' });
var root = require('../../lib/container')();
var Builder = require('../../lib/builder');
var sysDef = require('../data/sysdef.json');
var outMock = require('../mocks/out.js');

root.load(sysDef);

describe('build test', function() {

  beforeEach(function(done) {
    done();
  });

  afterEach(function(done) {
    done();
  });

  it('should fail the build if there are no suitable container types', function(done) {
    var builder = new Builder({ logger: logger }, {});
    var cDef = root.containerDefByDefId('222409de-150d-42fb-8151-da6b08fa7ce7');
    builder.build('live', sysDef, cDef, outMock(logger), function(err) {
      assert(err);
      done();
    });
  });

  it('should call container-specific methods', function(done){
    var buildCalled = false;
  
    var builder = new Builder({ logger: logger }, {
      docker: {
        build: function(mode, sysDef_, cDef_, out, cb) {
          buildCalled = true;
          assert.equal(mode, 'live');
          assert.deepEqual(sysDef_, sysDef);
          assert.deepEqual(cDef_, cDef);
          cb(null);
        }
      }
    });

    var cDef = root.containerDefByDefId('222409de-150d-42fb-8151-da6b08fa7ce7');
    builder.build('live', sysDef, cDef, outMock(logger), function(err) {
      assert(!err);
      assert(buildCalled);
      done();
    });
  });

  it('should update topology', function(done){
    var specific = { specific: 'data' };
    var cDefId = '222409de-150d-42fb-8151-da6b08fa7ce7';

    var builder = new Builder({ logger: logger }, {
      docker: {
        build: function(mode, system, cdef, out, cb) {
          cb(null, specific);
        }
      }
    });

    var cDef = root.containerDefByDefId(cDefId);
    builder.build('live', sysDef, cDef, outMock(logger), function(err) {
      assert(!err);

      var matches = _.filter(sysDef.topology.containers, function(c) {
        return c.containerDefinitionId === cDefId;
      });
      assert.equal(matches.length, 1);
      assert.deepEqual(matches[0].specific, specific);
      done();
    });
  });
});
