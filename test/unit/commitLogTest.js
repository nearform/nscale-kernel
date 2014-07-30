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
var cl = require('../../lib/commitlog/commitlog')({'apiPort': '8010', 'buildRoot': '/tmp/nfd', 'targetRoot': '/tmp/nfd/out', 'dbConnection': 'nfd' });



describe('commit test', function() {

  beforeEach(function(done) {
    done();
  });



  afterEach(function(done) {
    done();
  });



  it('should commit a revision', function(done) {
    var sys = require('./system.json');
    cl.commitRevision(sys.id, 'test commit', sys, function(err) {
      console.log(err);
      done();
    });
  });

  it('should get next revision number to label docker container', function(done) {
    var sys = require('./system.json');
    cl.nextRevisionNo(sys.id, function(err) {
      console.log(err);
      done();
    });
  });

  it('should get a revision from the history', function(done) {
    var sys = require('./system.json');
    cl.getRevision(sys.id, '1', function(err) {
      console.log(err);
      done();
    });
  });

  it('should get a revision from the history, if no version number is specified get the head', function(done) {
    var sys = require('./system.json');
    cl.getRevision(sys.id,'', function(err) {
      console.log(err);
      done();
    });
  });

  it('should set the currently deployed version and clear the currently deployed flag and set the deployed flag against the specified revision', function(done) {
    var sys = require('./system.json');
    cl.markDeployedRevision(sys.id, '1', function(err) {
      console.log(err);
      done();
    });
  });

  it('should set the currently deployed revision to head', function(done) {
    var sys = require('./system.json');
    cl.markHeadDeployed(sys.id, function(err) {
      console.log(err);
      done();
    });
  });

  it('should get the currently deployed version', function(done) {
    var sys = require('./system.json');
    cl.getDeployedRevision(sys.id, function(err) {
      console.log(err);
      done();
    });
  });

  it('should find revision by long or short guid', function(done) {
    var sys = require('./system.json');
    cl.findRevision(sys.id, '12345678-9d00-4a23-a268-b75abb109dc6', function(err) {
      console.log(err);
      done();
    });
  });

  it('should convert id', function(done) {
    var sys = require('./system.json');
    cl.convertId(sys.id, '15', function(err) {
      console.log(err);
      done();
    });
  });

  it('should list revisions', function(done) {
    var sys = require('./system.json');
    cl.listRevisions(sys.id, function(err, revisions) {
      console.log(JSON.stringify(revisions, null, 2));
      done();
    });
  });
});

