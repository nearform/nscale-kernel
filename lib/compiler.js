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

var compiler = require('nscale-compiler')();
var _ = require('lodash');
var async = require('async');
var ngit = require('nodegit');
var ku = require('./kutils');

// TODO unit test for this...

module.exports = function(synchrotron, logger) {

  var copySpecific = function(current, system) {
    _.each(system.topology.containers, function(container) {
      var matched = _.find(current.topology.containers, function(c) { return c.containerDefinitionId === container.containerDefinitionId; });
      if (matched) {
        _.merge(matched.specific, container.specific);
        _.merge(container.specific, matched.specific);
        if (matched.nativeId) {
          container.nativeId = matched.nativeId;
        }
      }
    });
  };


  var setCommitSha = function(system, cdef, out, cb) {
    var uh = ku.parseGitUrl(cdef.specific.repositoryUrl);
    var path = system.repoPath + '/workspace/' + uh.repo;
    ngit.Repository.open(path, function(err, repo) {
      if (err) { return cb(err); }
      ngit.Reference.nameToId(repo, 'HEAD', function(err, head) {
        if (err) { return cb(err); }
        var oldId = cdef.id;
        var commit = head.toString();

        cdef.id += '$' + commit;
        cdef.specific.commit = commit;

        // set the commit in all instances of that container definition
        _.chain(system.topology.containers)
         .values()
         .filter(function(c) { return c.containerDefinitionId === oldId; })
         .forEach(function(c) {
           c.containerDefinitionId = cdef.id;
           c.specific = c.specific || {};
           c.specific.commit = commit;
         });

        out.stdout('--> Renamed definition ' + oldId + ' into ' + cdef.id, 'info');

        cb();
      })
    })
  }


  var compile = function compile(getHeadFn, systemId, path, out, cb) {
    compiler.compileAll(path, function(err, systems) {
      if (err) { logger.error(err); out.stderr(err); return(err); }
      async.eachSeries(_.keys(systems), function(key, next) {
        var system = systems[key];
        system.repoPath = path;
        async.eachSeries(system.containerDefinitions, function(cdef, cb) {
          if (!cdef.specific || !cdef.specific.repositoryUrl) { return cb() }

          synchrotron.synch(system, cdef, out, function(err) {
            if (err) { return cb(err) };

            setCommitSha(system, cdef, out, function(err) {
              if (err) { return cb(err) };

              getHeadFn(systemId, key, function(err, current) {
                if (!(err || !current)) {
                  copySpecific(current, system);
                }
                cb()
              });
            });
          });
        }, function(err) {
          delete system.repoPath;
          next(err, system);
        });
      }, function() {
        cb(err, systems);
      });
    });
  };



  var listTargets = function listTargets(path, cb) {
    compiler.listTargets(path, cb);
  };



  return {
    compile: compile,
    listTargets: listTargets
  };
};


module.exports(null);

