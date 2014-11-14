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
var _ = require('lodash');
var fse = require('fs-extra');
var git = require('./gitutil');
var blank = {};
var SYSREPO = '_sys';



/**
 * maintains system repository conaining system meta information
 * maintains system commit log and history using nodegit
 * uses master branch only
 * need to be able to create a new repo on demand - for new system definition
 */
module.exports = function(options) {

  var _systems;
  var sysRepoPath = path.join(options.systemsRoot, SYSREPO);
  var systemsJsonPath = path.join(sysRepoPath, 'systems.json');


  /**
   * ensures that the system repository is in place, creates it if doesn't exist
   */
  var boot = function(cb) {
    fse.readFile(systemsJsonPath, 'utf8', function(err, data) {
      if (err) {
        if (err.code !== 'ENOENT') { return cb(err); }

        fse.mkdirpSync(sysRepoPath);
        fse.writeFileSync(systemsJsonPath, JSON.stringify(blank, null, 2), 'utf8');
        return git.createRepository(sysRepoPath, 'system', 'system@nfd.com', function(err_) {
          _systems = blank;
          cb(err_);
        });
      }

      _systems = JSON.parse(data);
      cb();
    });
  };



  /**
   * register a system
   */
  var register = function(user, namespace, name, repoName, repoPath, systemId, cb) {
    if (!_systems[systemId]) {
      _systems[systemId] = { name: name, namespace: namespace, repoName: repoName, repoPath: repoPath };
      fse.writeFileSync(systemsJsonPath, JSON.stringify(_systems, null, 2), 'utf8');
      git.commit(sysRepoPath, 'registered system: ' + repoPath, user.name, user.email, cb);
    }
    else {
      cb(null);
    }
  };



  /**
   * unregister a system
   */
  var unregister = function(user, systemId, cb) {
    if (!_systems[systemId]) { return cb(); }
    var newSystems = _.clone(_systems);
    delete newSystems[systemId];
    fse.writeFileSync(systemsJsonPath, JSON.stringify(newSystems, null, 2), 'utf8');
    _systems = newSystems;
    git.commit(sysRepoPath, 'unregistered system: ' + systemId, user.name, user.email, cb);
  };



  /**
   * returns a repository path from a system id
   */
  var repoPath = function(systemId) {
    return _systems[systemId].repoPath;
  };



  var repoId = function(repoName) {
    var systemId = _.find(_.keys(_systems), function(systemId) { return _systems[systemId].repoName === repoName; });
    return systemId;
  };



  var listSystems = function() {
    var result = [];
    _.each(_.keys(_systems), function(system) {
      result.push({name: _systems[system].repoName, id: system});
    });
    return result;
  };



  /**
   * convert identifier into full system guid using:
   * 1) exact match on key
   * 2) partial match on key
   * 3) partial match on name
   */
  var findSystem = function(identifier) {
    var re = new RegExp('^' + identifier + '.*', ['i']);
    var systemId;

    systemId = _.find(_.keys(_systems), function(system) { return system === identifier; });

    if (!systemId) {
      systemId = _.find(_.keys(_systems), function(system) { return re.test(system); });
    }

    if (!systemId) {
      systemId = _.find(_.keys(_systems), function(system) { return re.test(_systems[system].name); });
    }

    return systemId;
  };



  var systemExists = function(namespace, name) {
    var system = _.find(_systems, function(system) { return system.namespace === namespace && system.name === name; });
    return fse.existsSync(system.repoPath + '/system.json');
  };



  return {
    boot: boot,
    register: register,
    unregister: unregister,
    repoPath: repoPath,
    repoId: repoId,
    listSystems: listSystems,
    findSystem: findSystem,
    systemExists: systemExists
  };
};

