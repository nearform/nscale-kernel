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
module.exports = function() {

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
  /*
{
    "$set": {
          "containers.30.specific": {
                  "imageId": "ec9f9d6320a10lre8fha7c46bd556f1a587b69fe822ae7a41870d0c65191a"
                        }
            }
}
*/


  /**
   * deploys the latest version of a docker container only
   */
  var deployDockerContainer = function(head, containerDef, container, out, cb) {
    var tmpName = '/tmp/' + uuid.v4();
    out.stdout('deploying: ' + containerDef.id + ' -> ' + container.id);

    var script = fs.readFileSync(__dirname + '/deploylocaltemplate.sh', 'utf8');
    script = script.replace(/__TARGETNAME__/g, containerDef.specific.targetName);
    script = script.replace(/__ARGUMENTS__/g, containerDef.specific.arguments);
    out.stdout(script);
    fs.writeFileSync(tmpName, script, 'utf8');
    executor.exec('sh ' + tmpName, '/tmp', out, function(err) {
      out.stdout('done!');
      cb(err);
    });
  };



  /**
   * hacked diff deploy
   */
  var deployDiff = function(systemId, head, diff, out, cb) {
    _.each(_.keys(diff.$set), function(key) {
     var path = key.split('.');

     // nasty hack - assume docker deploy
     if (path[0] === 'containers' && path[2] === 'specific') {
       var container = head.system.topology.containers[path[1]];
       var containerDef = _.find(head.system.containerDefinitions, function(cdef) {
         return cdef.id === container.containerDefinitionId;
       });
       deployDockerContainer(head, containerDef, container, out, function(err, result){
         /// then need to mark the system deployed
         cb(err, result);
       });
     }
    });
  };



  /**
   * docker specific deploy - hacked only
   */
  var deploy = function(systemId, db, cl, out, cb) {
    out.stdout('deploying...');

    cl.getDeployedRevision(systemId, function(err, deployed) {
      if (err) { return cb(err); }
      if (deployed) {
        cl.getHead(systemId, function(err, head) {
          if (err) { return cb(err); }
          if (head) {
            var diff = rd.diff(deployed.system.topology, head.system.topology);
            out.stdout(JSON.stringify(diff, null, 2));
            deployDiff(systemId, head, diff, out, function(err, result) {
              cb(err, result);
            });
          }
          else {
            out.stdout('no head revision - aborting');
            cb();
          }
        });
      }
      else {
        // in fact we should diff against {}
        out.stdout('no currently deployed revision - aborting');
        cb();
      }
    });
  
    /*
     * executor.exec('sh deploy.sh ' + system.namespace + ' ' + containerDef.specific.targetName + ' ' + containerDef.specific.targetName, __dirname, out, function(err) {
      cb(err);
    });
    */
  };



  var construct = function() {
  };



  construct();
  return {
    deploy: deploy,
  };
};

