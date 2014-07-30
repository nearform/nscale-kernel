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

var _ = require('underscore');
var assert = require('assert');
var sysrev = require('../../lib/sysrev/sysrev')({systemsRoot: '/tmp/nfd/systems'});
var CONTAINER_DEF = { 'name': 'test',
                      'type': 'docker',
                      'specific': {
                        'repositoryUrl': 'git@github.com:pelger/startupdeathclock.git',
                        'buildScript': 'builddoc.sh',
                        'arguments': '-p 9002:9002 -d __TARGETNAME__ /usr/bin/node /srv/doc-srv',
                        'buildHead': 21,
                        'binary': '/tmp/nfd/sudc/builds/doc-srv-20',
                        'dockerImageId': '335ec84437051155ecf37f54f5e158508a228961b813fbc0b6ab6ed0d73a6816'
                      },
                      'version': '0.1.0',
                      'id': '222409de-150d-42fb-8151-da6b08fa7ce7' };
var CONTAINER_ADD_DEF = { 'name': 'testing2',
                          'type': 'docker',
                          'specific': {
                            'repositoryUrl': 'git@github.com:pelger/startupdeathclock.git',
                            'buildScript': 'builddoc.sh',
                            'arguments': '-p 9002:9002 -d __TARGETNAME__ /usr/bin/node /srv/doc-srv',
                            'buildHead': 21,
                            'binary': '/tmp/nfd/sudc/builds/doc-srv-20',
                            'dockerImageId': '335ec84437051155ecf37f54f5e158508a228961b813fbc0b6ab6ed0d73a6816'
                          },
                          'version': '0.1.0',
                          'id': '88888888-150d-42fb-8151-da6b08fa7ce7' };

describe('sysrev test', function() {

  beforeEach(function(done) {
    sysrev.boot(function(err) {
      assert(!err);
      done();
    });
  });



  afterEach(function(done) {
    done();
  });



  it('should create a repository', function(done){
    sysrev.createSystem('test', 'test', function(err, system) {
      assert(!err);
      console.log(system.id);
      sysrev.listRevisions(system.id, function(err, revs) {
        assert(!err);
        assert(revs);
        done();
      });
    });
  });



  it('should get a revision', function(done){
    sysrev.listRevisions(sysrev.sid('test', 'test'), function(err, revs) {
      assert(!err);
      sysrev.getRevision(sysrev.sid('test', 'test'), revs[0].id, function(err, json) {
        assert(!err);
        assert(json);
        done();
      });
    });
  });



  it('should create a new revision', function(done){
    var sysId = sysrev.sid('test', 'test');
    sysrev.listRevisions(sysId, function(err, revs) {
      assert(!err);
      sysrev.getRevision(sysId, revs[0].id, function(err, json) {
        json.containerDefinitions.push(CONTAINER_DEF);
        sysrev.commitRevision(sysId, 'added container def', json, function() {
          sysrev.listRevisions(sysId, function(err, revs) {
            sysrev.getRevision(sysId, revs[0].id, function(err, json) {
              assert(!err);
              assert(json.name === 'test');
              assert(json.namespace === 'test');
              assert(json.containerDefinitions[0].name);
              done();
            });
          });
        });
      });
    });
  });



  it('should read the head revision correctly', function(done){
    var sysId = sysrev.sid('test', 'test');
    sysrev.getHead(sysId, function(err, json) {
      assert(!err);
      assert(json.name === 'test');
      assert(json.namespace === 'test');
      assert(json.containerDefinitions[0].name);
      done();
    });
  });



  it('should correctly mark the deployed revision', function(done){
    var sysId = sysrev.sid('test', 'test');
    sysrev.listRevisions(sysId, function(err, revs) {
      assert(!err);
      sysrev.markDeployedRevision(sysId, revs[0].id, function(err) {
        assert(!err);
        sysrev.getDeployedRevision(sysId, function(err, json) {
          assert(!err);
          assert(json);
          done();
        });
      });
    });
  });



  it('should list the available systems', function(done){
    var systems = sysrev.listSystems();
    assert(systems);
    assert(systems[0].name === 'test_test');
    done();
  });



  it('should find a system from a partial name', function(done){
    var systems = sysrev.listSystems();
    assert(sysrev.findSystem('test') === systems[0].id);
    done();
  });



  it('should find a container from a guid', function(done){
    var systems = sysrev.listSystems();
    sysrev.findContainer(systems[0].id, '22', function(err, containerId) {
      assert(containerId);
      done();
    });
  });



  it('should find a revision from a partial guid', function(done){
    var systems = sysrev.listSystems();
    sysrev.listRevisions(systems[0].id, function(err, revisions) {
      assert(!err);
      sysrev.findRevision(systems[0].id, revisions[0].id.substr(0, 5), function(err, revisionId) {
        assert(!err);
        assert(revisionId === revisions[0].id);
        done();
      });
    });
  });



  it('should add and remove containers correctly', function(done) {
    var systems = sysrev.listSystems();
    var count;
    sysrev.getHead(systems[0].id, function(err, head) {
      assert(!err);
      count = parseInt(head.containerDefinitions.length, 10);
      sysrev.addContainer(systems[0].id, CONTAINER_ADD_DEF, function(err) {
        assert(!err);
        sysrev.getHead(systems[0].id, function(err, head) {
          assert(!err);
          assert(head.containerDefinitions.length === count + 1);
          CONTAINER_ADD_DEF.version = '0.2.0';
          sysrev.putContainer(systems[0].id, CONTAINER_ADD_DEF, function(err) { 
            assert(!err);
            sysrev.getHead(systems[0].id, function(err, head) {
              assert(!err);
              assert(head.containerDefinitions.length === count + 1);
              sysrev.deleteContainer(systems[0].id, CONTAINER_ADD_DEF.id, function(err) {
                assert(!err);
                sysrev.getHead(systems[0].id, function(err, head) {
                  assert(!err);
                  assert(head.containerDefinitions.length === count);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });



  it('should clone a system', function(done) {
    this.timeout(10000000);
    sysrev.cloneSystem('git@github.com:pelger/sudc.git', function(err) {
      assert(!err);
      var systems = sysrev.listSystems();
      var sudc = _.find(systems, function(system) { return system.name === 'sudc'; });
      assert(sudc);
      done();
    });
  });


  it('should add a remote to a system', function(done) {
    done();
  });



  it('should sync system details', function(done) {
    this.timeout(10000000);
    var systems = sysrev.listSystems();
    var sudc = _.find(systems, function(system) { return system.name === 'sudc'; });
    sysrev.syncSystem(sudc.id, function(err) {
      assert(!err);
      done();
    });
  });
});

