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



module.exports = function(options) {
  var _sysRoot;
  var _db;
  var _builder;
  var _deployer;
  var _synchrotron;



  /**
   * list all of the available systems
   */
  var listSystems = function(cb) {
    _db.listSystems(function(err, systems) {
      cb(err, systems);
    });
  };



  /**
   * get the full system definition
   */
  var getSystem = function(systemId, cb) {
    _db.loadSystem(systemId, function(err, json) {
      cb(err, json);
    });
  };



  /**
   * create a new system
   */
  var createSystem = function(name, namespace, cb) {
    _db.createSystem(name, namespace, function(err, json) {
      cb(err, json);
    });
  };



  /**
   * put the system definition
   */
  var putSystem = function(system, cb) {
    var doc = JSON.parse(system);
    _db.saveSystem(doc, function(err, json) {
      cb(err, json);
    });
  };



  /**
   * delete the system
   */
  var deleteSystem = function(systemId, cb) {
    _db.deleteSystem(systemId, function(err, json) {
      cb(err, json);
    });
  };



  /**
   * list all of the available containers in a system
   */
  var listContainers = function(systemId, cb) {
    _db.loadSystem(systemId, function(err, json) {
      cb(err, json.containerDefinitions);
    });
  };




  /**
   * add a new container to the system
   */
  var addContainer = function(systemId, container, cb) {
    var cont = JSON.parse(container);
    _db.addContainer(systemId, cont, function(err) {
      cb(err);
    });
  };



  /**
   * update the container
   */
  var putContainer = function(systemId, container, cb) {
    var cont = JSON.parse(container);
    _db.putContainer(systemId, cont, function(err) {
      cb(err);
    });
  };



  /**
   * update the container
   */
  var deleteContainer = function(systemId, containerId, cb) {
    _db.deleteContainer(systemId, containerId, function(err) {
      cb(err);
    });
  };



  /**
   * build a container
   */
  var buildContainer = function(systemId, containerDefId, out, cb) {
    _db.loadSystem(systemId, function(err, json) {
      var root = _sysRoot(options);
      var sync = _synchrotron(options);
      root.load(json);
      var containerDef = root.containerDefByDefId(containerDefId);
      sync.synch(json, containerDef, out, function(err) {
        if (err) { return cb(err); }
        _builder.build(json, containerDef, out, function(err) {
          cb(err);
        });
      });
    });
  };



  /**
   * deploy a container
   */
  var deployContainer = function(systemId, containerDefId, out, cb) {
    _db.loadSystem(systemId, function(err, json) {
      var root = _sysRoot(options);
      root.load(json);
      var containerDef = root.containerDefByDefId(containerDefId);
      _deployer.deploy(json, containerDef, out, function(err) {
        cb(err);
      });
    });
  };



  var construct = function() {
    _sysRoot = require('./container/root');
    _synchrotron = require('./container/synch/syncrotron');
    _db = require('./db/db')(options);
    _builder = require('./container/build/builder')(options);
    _deployer = require('./topology/deploy/deployer');
  };



  construct();
  return {
    listSystems: listSystems,
    createSystem: createSystem,
    getSystem: getSystem,
    putSystem: putSystem,
    deleteSystem: deleteSystem,

    listContainers: listContainers,
    buildContainer: buildContainer,
    addContainer: addContainer,
    putContainer: putContainer,
    deleteContainer: deleteContainer,
    deployContainer: deployContainer
  };
};


