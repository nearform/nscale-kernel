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
var fse = require('fs-extra');
var uuid = require('uuid');
var git = require('./gitutil');
var srMeta = require('./sysrevMeta');

//TODO: replace these
var GIT_NAME = 'Peter Elger';
var GIT_MAIL = 'peter.elger@nearform.com';



/**
 * timeline is an annotated git log, updated to use git avatars etc...
 */
module.exports = function(options) {


  /**
   * list timeline entries
   */
  var timeline = function(systemId, cb) {
    _sr.listRevisions(systemId, function(err, revisions) {
      if (err) { return cb(err); }






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
    });
  };

  return {
    listTimeline: listTimeline
  };
};

