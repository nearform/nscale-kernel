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
var mongojs = require('mongojs');
var collections = ['systems'];
var uuid = require('uuid');
var blank = {'name': '',
             'namespace': '',
             'id': '',
             'containerDefinitions': [],
             'topology': {'containers': {}}};



/**
 * systems database
 * this should be replaced entirely by the commit log - essentially just holds the head revision
 */
module.exports = function(options) {
  var _db;



  /**
   * create a new system definition
   */
  var createSystem = function(name, namespace, cb) {
    var doc = _.extend({}, blank);
    doc.name = name;
    doc.namespace = namespace;
    doc.id = uuid.v4();
    _db.systems.save(doc, function(err) {
      cb(err, doc);
    });
  };



  /**
   * return a list of all containers in the system
   */
  var listSystems = function(cb) {
    _db.systems.find({}, function(err, data) {
      var result = [];
      _.each(data, function(system) {
        result.push({id: system.id, name: system.name});
      });
      cb(err, result);
    });
  };



  /**
   * load the system definition
   */
  var loadSystem = function(id, cb) {
    _db.systems.find({'id': id}, function(err, data) {
      cb(err, data[0]);
    });
  };



  /**
   * save the system definition
   */
  var saveSystem = function(doc, cb) {
    _db.systems.find({'id': doc.id}, function(err, data) {
      if (err) { return cb(err); }
      if (data.length === 0) {
        _db.systems.save(doc, function(err) {
          cb(err);
        });
      }
      else {
        console.log(doc);
        doc._id = data[0]._id;
        _db.systems.save(doc, function(err) {
          cb(err);
        });
      }
    });
  };



  var deleteSystem = function(systemId, cb) {
    _db.systems.remove({'id': systemId}, function(err) {
      cb(err);
    });
  };



  /**
   * create a new container and add it to the specified system
   */
  var addContainer = function(systemId, container, cb) {
    if (!container.id) {
      container.id = uuid.v4();
    }
    _db.systems.find({'id': systemId}, function(err, data) {
      if (err) { return cb(err); }
      if (data.length > 0) {
        data[0].containerDefinitions.push(container);
        saveSystem(data[0], function(err) {
          cb(err, data[0]);
        });
      }
    });
  };



  /**
   * update a continaer definition
   */
  var putContainer = function(systemId, container, cb) {
    var idx = 0;
    var foundIdx = -1;

    _db.systems.find({'id': systemId}, function(err, data) {
      if (err) { return cb(err); }
      if (data.length > 0) {
        _.each(data[0].containerDefinitions, function(cdef) {
          if (cdef.id === container.id) {
            foundIdx = idx;
          }
          ++idx;
        });
        if (foundIdx !== -1) {
          data[0].containerDefinitions[foundIdx] = container;
        }
        saveSystem(data[0], function(err) {
          cb(err, data[0]);
        });
      }
    });
  };



  var deleteContainer = function(systemId, containerId, cb) {
    var idx = 0;
    var foundIdx = -1;

    _db.systems.find({'id': systemId}, function(err, data) {
      if (err) { return cb(err); }
      if (data.length > 0) {
        _.each(data[0].containerDefinitions, function(cdef) {
          if (cdef.id === containerId) {
            foundIdx = idx;
          }
          ++idx;
        });
        if (foundIdx !== -1) {
          data[0].containerDefinitions.splice(foundIdx, 1);
        }
        saveSystem(data[0], function(err) {
          cb(err, data[0]);
        });
      }
    });
  };



  /**
   * connect to db
   */
  var construct = function() {
    _db = mongojs(options.dbConnection, collections);
  };



  construct();
  return {
    loadSystem: loadSystem,
    saveSystem: saveSystem,
    listSystems: listSystems,
    deleteSystem: deleteSystem,
    createSystem: createSystem,

    addContainer: addContainer,
    putContainer: putContainer,
    deleteContainer: deleteContainer
  };
};


