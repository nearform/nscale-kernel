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

var collections = ['history'];
var mongojs = require('mongojs');
var uuid = require('uuid');



/**
 * maintains system commit log and history
 *
 * TODO: merge this with system db
 *
 * history maintains a history of all versions of the system in the following format
 *
 * {
 *   revision: 
 *   Description: 
 *   Deployed: 
 *   prev:
 *   systemId: 
 *   sys: {...}
 * }
 */
module.exports = function(options) {
  var _db;



  /**
   * commit a new version of the system, the head of the commit log 
   * may be ahead of the actual deployed version of the system
   */
  var commitRevision = function(systemId, description, sysJson, cb) {
    var rev;
    getHead(systemId, function(err, head) {
      if (err) { return cb(err); }
      if (head) {
        rev = {revision: head.revision + 1,
               guid: uuid.v4(),
               description: description,
               deployed: false,
               previous: head._id,
               systemId: sysJson.id,
               system: sysJson};
      }
      else {
        rev = {revision: 1,
               guid: uuid.v4(),
               description: description,
               deployed: true,
               previous: null,
               systemId: sysJson.id,
               system: sysJson};
      }
      _db.history.save(rev, function(err) {
        cb(err);
      });
    });
  };



  /**
   * quick hack - get next revision number to label docker container with...
   */
  var nextRevisionNo = function(systemId, cb) {
    var rev;
    getHead(systemId, function(err, head) {
      if (err) { return cb(err); }
      if (head) {
        rev = head.revision + 1;
      }
      else {
        rev = 1;
      }
      cb(err, rev);
    });
  };



  /**
   * get the head revision for a system
   */
  var getHead = function(systemId, cb) {
    _db.history.find({systemId: systemId}).sort({revision: -1}, function(err, data) {
      if (err) { return cb(err); }
      cb(null, data[0]);
    });
  };



  /**
   * get a revision from the history, if no version number is specified get the head
   */
  var getRevision = function(systemId, revisionId, cb) {
    if (!revisionId) {
      getHead(systemId, cb);
    }
    else {
      var revId = parseInt(revisionId, 10);
      _db.history.find({systemId: systemId, revision: revId}, function(err, revision) {
        if (err) { return cb(err); }
        cb(null, revision[0]);
      });
    }
  };



  /**
   * set the currently deployed revision, there will only ever be one deployed revision
   * clear the currently deployed flag and set the deployed flag against the specified revision
   */
  var markDeployedRevision = function(systemId, revisionId, cb) {
    var revId = parseInt(revisionId, 10);
    _db.history.update({systemId: systemId}, {$set:{deployed: false}}, {multi: true}, function(e1) {
      if (e1) { return cb(e1); }
      _db.history.update({systemId: systemId, revision: revId}, {$set:{deployed: true}}, function(e2) {
        cb(e2);
      });
    });
  };



  /**
   * set the currently deployed revision to head, there will only ever be one deployed revision
   * clear the currently deployed flag and set the deployed flag against the specified revision
   */
  var markHeadDeployed = function(systemId, cb) {
    getHead(systemId, function(err, head) {
      markDeployedRevision(systemId, head.revision, function(err) {
        cb(err);
      });
    });
  };



  /**
   * get the currently deployed revision
   */
  var getDeployedRevision = function(systemId, cb) {
    _db.history.find({systemId: systemId, deployed: true}, function(err, deployed) {
      cb(err, deployed[0]);
    });
  };



  /**
   * list all of the available revisions in the system
   */
  var listRevisions = function(systemId, cb) {
    _db.history.find({systemId: systemId},{}).sort({revision: -1}, function(err, data) {
      if (err) { return cb(err); }
      cb(null, data);
    });
  };



  /**
   * find revision by long or short guid
   */
  var findRevision = function(systemId, identifier, cb) {
    console.log('----> ' + systemId);
    console.log('----> ' + identifier);
    console.log('----> ' + _db);
    _db.history.find({systemId: systemId, guid: identifier}, function(err, data) {
      if (err) { return cb(err); }
      if (data.length > 0) {
        cb(null, identifier);
      }
      else {
        var re = new RegExp(identifier + '.*', ['i']);
        console.log('----> ' + _db);
        _db.systems.find({systemId: systemId, guid: re}, function(err, data) {
          if (err) { return cb(err); }
          if (data.length > 0) {
            cb(null, identifier);
          }
          else {
            cb('not found', null);
          }
        });
      }
    });
  };



  var construct = function() {
    _db = mongojs(options.dbConnection, collections);
  };



  var convertId = function(systemId, id, cb) {
    if (id.length > 4) {
      _db.history.find({systemId: systemId, guid: id}, function(err, data) {
        cb(err, data[0].revision);
      });
    }
    else {
      cb(null, id);
    }
  };



  construct();
  return {
    commitRevision: commitRevision,
    nextRevisionNo: nextRevisionNo,
    markDeployedRevision: markDeployedRevision,
    markHeadDeployed: markHeadDeployed,
    getDeployedRevision: getDeployedRevision,
    listRevisions: listRevisions,
    getHead: getHead,
    getRevision: getRevision,
    convertId: convertId,
    findRevision: findRevision
  };
};


