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
var uuid = require('uuid');
var logger = require('winston');

var collections = ['timeline'];
var mongojs = require('mongojs');


/**
 * maintains user and system timeline
 *
 * timeline maintains entries in the following format
 *
 * {
 *   user:
 *   systemId:
 *   containerId:
 *   created:
 *   type:
 *   data:
 * }
 */
module.exports = function(options) {
  var _db;





  /**
   * list timeline entries
   */
  var timeline = function(systemId, containerId, user, cb) {
    var q = {};
    if(systemId && systemId !== 'null' && systemId !== 'undefined') {q.systemId=systemId};
    if(containerId && containerId !== 'null' && containerId !== 'undefined') {q.containerId=containerId};
    if(user && user !== 'null' && user !== 'undefined') {q.user=user};
    _db.timeline.find(q).sort({created: -1}, function(err, data) {
      if (err) { return cb(err); }

      var result = [];
      _.each(data, function(entry) {
        result.push({user: entry.user, systemId: entry.systemId, containerId:entry.containerId, created:entry.created, type:entry.type, data:entry.data});
      });

      cb(null, result);
    });
  };




  /**
   * add to timeline
   */
  var add = function(timelineJson, cb) {
    var tl = JSON.parse(timelineJson);
    if (!tl.id) {
      tl.id = uuid.v4();
    }
    tl.created = new Date();
    _db.timeline.save(tl, function(err) {
      cb(err);
    });
  };




  var construct = function() {
    _db = mongojs(options.dbConnection, collections);
  };




  construct();
  return {
    timeline: timeline,
    add: add
  };
};


