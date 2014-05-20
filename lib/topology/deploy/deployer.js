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

var fs = require('fs');
var _ = require('underscore');
var rd = require('rus-diff');
var uuid = require('uuid');
var executor = require('../../util/executor');



/**
 * hacked deployer for demo only
 */
module.exports = function(options) {

    /*
     * get the deployed revision
     * get the head revision
     * diff and output
     */

    /*
     * action to deploy container
     * hack it to just deploy eon container
     */

    /*
     * action to move container
     * hack it to just move one container
     */

    /*
     * it time make more general ??
     */


  /**
   * deploys the latest version of a docker container only
   */
  var stopDockerContainer = function(targetHost, containerDef, out, cb) {
    var tmpName = '/tmp/' + uuid.v4();

    //var script = fs.readFileSync(__dirname + '/deploylocaltemplate.sh', 'utf8');
    var script = fs.readFileSync(__dirname + '/stopremotetemplate.sh', 'utf8');
    script = script.replace(/__TARGETHOST__/g, targetHost);
    script = script.replace(/__TARGETNAME__/g, containerDef.specific.targetName);
    out.stdout(script);
    fs.writeFileSync(tmpName, script, 'utf8');
    executor.exec('sh ' + tmpName, '/tmp', out, function(err) {
      out.stdout('done!');
      cb(err);
    });
  };



  /**
   * deploys the latest version of a docker container only
   */
  var deployDockerContainer = function(targetHost, target, containerDef, container, out, cb) {
    var tmpName = '/tmp/' + uuid.v4();
    out.stdout('deploying: ' + containerDef.id + ' -> ' + container.id);

    //var script = fs.readFileSync(__dirname + '/deploylocaltemplate.sh', 'utf8');
    var script = fs.readFileSync(__dirname + '/deployremotetemplate.sh', 'utf8');
    script = script.replace(/__ARGUMENTS__/g, containerDef.specific.arguments);
    script = script.replace(/__REPOSITORY__/g, options.repositoryHost);
    script = script.replace(/__TARGETHOST__/g, targetHost);
    script = script.replace(/__TARGETNAME__/g, containerDef.specific.targetName);
    script = script.replace(/__REVISIONNUMBER__/g, target.revision);
    out.stdout(script);
    fs.writeFileSync(tmpName, script, 'utf8');
    executor.exec('sh ' + tmpName, '/tmp', out, function(err) {
      out.stdout('done!');
      cb(err);
    });
  };

/* move deploy - run a deploy all which should stop all now too :)
{
    "$rename": {
          "containers.21.contains.2": "containers.21.contains.1"
              },
        "$set": {
              "containers.20.contains.1": "40",
                  "containers.21.contains.0": "50",
                      "containers.40.containedBy": "20"
                          }
}
*/
/*
{
    '$set': {
          'containers.30.specific': {
                  'imageId': 'ec9f9d6320a10lre8fha7c46bd556f1a587b69fe822ae7a41870d0c65191a'
                        }
            }
}
*/


  /**
   * hacked diff deploy
   */
  var deployDiff = function(systemId, target, diff, out, cb) {
     var container;
     var containerDef;
     var targetHost;
     var done = false;

    _.each(_.keys(diff.$set), function(key) {
     var path = key.split('.');


     // nasty hack - assume docker deploy
     if (path[0] === 'containers' && path[2] === 'specific' && !done) {
       done = true;
       container = target.system.topology.containers[path[1]];
       containerDef = _.find(target.system.containerDefinitions, function(cdef) {
         return cdef.id === container.containerDefinitionId;
       });

       //get target host
       targetHost = target.system.topology.containers[container.containedBy].specific.ipaddress;

       deployDockerContainer(targetHost, target, containerDef, container, out, function(err, result){
         /// then need to mark the system deployed
         cb(err, result);
       });
     }
     else if (path[0] === 'containers' && path[2] === 'containedBy') {
       done = true;
       container = target.system.topology.containers[path[1]];
       containerDef = _.find(target.system.containerDefinitions, function(cdef) {
         return cdef.id === container.containerDefinitionId;
       });

       //get target host
       targetHost = target.system.topology.containers[container.containedBy].specific.ipaddress;

       stopDockerContainer('10.74.143.152', containerDef, out, function() {
         stopDockerContainer('10.75.29.243', containerDef, out, function() {
           deployDockerContainer(targetHost, {revision: 3}, containerDef, container, out, function(err, result){
             cb(err, result);
           });
         });
       });
     }
    });
  };



  /**
   * docker specific deploy - hacked only
   */
  var deploy = function(systemId, revisionId, db, cl, out, cb) {
    out.stdout('deploying...');

    //?? HACK TESTING
    /*var diff = { '$set': { 'containers.40.specific.imageId': 'bf9f7c28-24b2-43ea-8326-39f86bbfee77' } };
    cl.getHead(systemId, function(err, head) {
      deployDiff(systemId, head, diff, out, function(err, result) {
        cb(err, result);
      });
    });*/
    //?? HACK TESTING

    cl.getDeployedRevision(systemId, function(err, deployed) {
      if (err) { return cb(err); }
      if (deployed) {
        cl.getRevision(systemId, revisionId, function(err, target) {
          if (err) { return cb(err); }
          if (target) {
            var diff = rd.diff(deployed.system.topology, target.system.topology);
            out.stdout(JSON.stringify(diff, null, 2));
            console.log('---------------');
            console.log(JSON.stringify(diff, null, 2));
            console.log('---------------');
            if (diff) {
              deployDiff(systemId, target, diff, out, function(err, result) {
                //cl.markHeadDeployed(systemId, function() {
                cl.markDeployedRevision(systemId, revisionId, function() {
                  cb(err, result);
                });
              });
            }
            else {
              cb(err);
            }
          }
          else {
            out.stdout('no target revision - aborting', 'warn');
            cb();
          }
        });
      }
      else {
        // in fact we should diff against {}
        out.stdout('no currently deployed revision - aborting', 'warn');
        cb();
      }
    });
  };



  var doDeployAll = function(index, head, dockerContainers, out, cb) {
    if (dockerContainers[index]) {
      var container = head.system.topology.containers[dockerContainers[index]];
      var containerDef = _.find(head.system.containerDefinitions, function(cdef) {
        return cdef.id === container.containerDefinitionId;
      });
      var targetHost = head.system.topology.containers[container.containedBy].specific.ipaddress;
      deployDockerContainer(targetHost, head, containerDef, container, out, function(){
        doDeployAll(index + 1, head, dockerContainers, out, cb);
      });
    }
    else {
      cb();
    }
  };



  /**
   * HACK demo function to deploy/redeploy all docker containers irrespective of diff
   */
  var deployAll = function(systemId, db, cl, out, cb) {
    out.stdout('deploying all...');
    //var dockerContainers = ['30', '40', '50', '60'];
    var dockerContainers = ['30'];

    cl.getHead(systemId, function(err, head) {
      if (err) { return cb(err); }
      doDeployAll(0, head, dockerContainers, out, function() {
        cb();
      });
    });
  };



  var construct = function() {
  };



  construct();
  return {
    deploy: deploy,
    deployAll: deployAll
  };
};


