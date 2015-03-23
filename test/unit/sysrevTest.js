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

var path = require('path');
var assert = require('assert');
var bunyan = require('bunyan');
var fs = require('fs-extra');
var Sysrev = require('../../lib/sysrev/sysrev');
var getTmpDir = require('../helpers/get-tmp-dir');

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

var user = { name: 'test', email: 'test@test.com' };
var tmpDir = getTmpDir();
var timelinesRoot = path.join(tmpDir, 'timelines');
var sysrev = new Sysrev({ systemsRoot: tmpDir, timelinesRoot: timelinesRoot }, bunyan.createLogger({ name: 'sysrev-test', level: 60 }));

fs.mkdirSync(timelinesRoot);

describe('sysrev test', function() {
  var systemId;

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
    sysrev.createSystem(user, 'test', 'test', tmpDir, function(err, system) {
      assert(!err);

      systemId = system.id;

      sysrev.listRevisions(system.id, function(err, revs) {
        assert(!err);
        assert(revs);
        done();
      });
    });
  });


  it('should create a .gitignore when creating a repository', function(done){
    var repoPath = tmpDir + '/test';

    fs.readdir(repoPath, function(err, files) {
      assert(!err);
      assert(files.indexOf('.gitignore') >= 0, 'missing .gitignore');
      done();
    });
  });

  it('should error when getting a revision without compilation', function(done){
    sysrev.listRevisions(systemId, function(err, revs) {
      assert(!err);
      sysrev.getRevision(systemId, revs[0].id, 'development', function(err, json) {
        assert(err);
        assert(!json);
        done();
      });
    });
  });

  it('should create and get a revision', function(done){
    var expected = {
      'name': 'test',
      'namespace': 'test',
      'id': systemId,
      'containerDefinitions': [CONTAINER_DEF],
      'topology': {
        'containers': {}
      }
    };

    // fake a compilation
    fs.writeFileSync(path.join(tmpDir, 'test', 'development.json'), JSON.stringify(expected));

    sysrev.commitRevision(user, systemId, 'fake compilation', function(err) {
      assert(!err);

      sysrev.listRevisions(systemId, function(err, revs) {
        assert(!err);
        sysrev.getRevision(systemId, revs[0].id, 'development', function(err, json) {
          assert(json);
          assert(!err);
          done();
        });
      });
    });
  });

  it('should read the head revision correctly', function(done){
    sysrev.getHead(systemId, 'development', function(err, json) {
      assert(!err);
      assert(json.name === 'test');
      assert(json.namespace === 'test');
      assert(json.containerDefinitions[0].name);
      done();
    });
  });

  it('should correctly mark the deployed revision', function(done){
    sysrev.listRevisions(systemId, function(err, revs) {
      assert(!err);
      sysrev.markDeployedRevision(user, systemId, revs[0].id, 'development', function(err) {
        assert(!err);
        sysrev.getDeployedRevision(systemId, 'development', function(err, json) {
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
    assert.equal(systems.length, 1);
    assert.equal(systems[0].name, 'test');
    done();
  });

  it('should find a system from a partial name', function(done){
    var systems = sysrev.listSystems();
    assert(sysrev.findSystem('test') === systems[0].id);
    done();
  });

  it('should not find a system called \'.\'', function(done){
    assert(sysrev.findSystem('.') === undefined);
    done();
  });

  it('should find a container from a guid', function(done){
    var systems = sysrev.listSystems();
    sysrev.findContainer(systems[0].id, '22', 'development', function(err, containerId) {
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

  it('should support the "head" alias for the most-recent revision', function(done){
    var systems = sysrev.listSystems();
    sysrev.listRevisions(systems[0].id, function(err, revisions) {
      assert(!err);
      sysrev.findRevision(systems[0].id, 'head', function(err, revisionId) {
        assert(!err);
        assert(revisionId === revisions[0].id);
        done();
      });
    });
  });

  it('should support the "latest" alias for the most-recent revision', function(done){
    var systems = sysrev.listSystems();
    sysrev.listRevisions(systems[0].id, function(err, revisions) {
      assert(!err);
      sysrev.findRevision(systems[0].id, 'latest', function(err, revisionId) {
        assert(!err);
        assert(revisionId === revisions[0].id);
        done();
      });
    });
  });

  it('should fail to link a directory with no system.js', function(done) {
    sysrev.linkSystem(user, '.', getTmpDir(), function(err) {
      assert(err);
      done();
    });
  });

  it('should link a directory', function(done) {
    var original = path.join(__dirname, '..', 'data', 'system');
    var toLink = getTmpDir();
    fs.copy(original, toLink, function(err) {
      assert(!err);
      sysrev.linkSystem(user, '.', toLink, function(err, system) {
        assert(!err);
        assert(sysrev.listSystems().some(function(system_) {
          return system_.id === system.id;
        }));
        done();
      });
    });
  });

  it('should unlink a system', function(done) {
    sysrev.createSystem(user, 'unlinkme', 'unlinkme', tmpDir, function(err, system) {
      assert(!err);
      var systemId = system.id;
      sysrev.unlinkSystem(user, systemId, function(err_) {
        assert(!err_);
        assert(!sysrev.listSystems().some(function(system) {
          return system.id === systemId;
        }));
        done();
      });
    });
  });

  it('should read the timeline', function(done){
    sysrev.getTimeline('test', function(err, list) {
      assert(!err, 'no error');
      assert(Array.isArray(list), 'list is an array');
      assert(list.length > 0, 'list has some content');
      done();
    });
  });
});
