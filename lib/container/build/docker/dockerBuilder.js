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

var fse = require('fs-extra');
var fs = require('fs');
var executor = require('../../../util/executor');
var paths = require('../../../util/paths');



/**
 * container abstraction
 */
module.exports = function(options) {
  var _docker; 



  /**
   * run docker specific build
   */
  var build = function(system, containerDef, targetPath, out, cb) {
    out.stdout('docker build...');
    var targetName = containerDef.name.replace(' ', '_');
    var path = paths.generateTargetPath(system, options, containerDef);
    var buildPath = paths.generateBuildPath(system, options);
    fse.mkdirp(buildPath);

    path = path + '/';
    console.log('Path = ' + path);
    console.log('Path + targetPath = ' + path + targetPath);
    console.log('buildPath = ' + buildPath);
    var script = fs.readFileSync(__dirname + '/containerBuildTemplate.sh', 'utf8');
    script = script.replace(/__NAMESPACE__/g, system.namespace);
    script = script.replace(/__TARGETNAME__/g, targetName);
    script = script.replace(/__BUILDNUMBER__/g, containerDef.specific.buildHead);
    //script = script.replace(/__BUILDPATH__/g, buildPath);
    fs.writeFileSync(path + targetPath + '/container.sh', script, 'utf8');
    out.stdout(script);

    executor.exec('sh container.sh ' + system.namespace + ' ' + containerDef.specific.targetName, path + targetPath, out, function() {
      out.progress();
      //if (err) { return cb(err); }
      fse.remove(path + '/container.sh', function() {
        var script = fs.readFileSync(__dirname + '/containerExportTemplate.sh', 'utf8');
        script = script.replace(/__NAMESPACE__/g, system.namespace);
        script = script.replace(/__TARGETNAME__/g, targetName);
        script = script.replace(/__BUILDNUMBER__/g, containerDef.specific.buildHead);
        script = script.replace(/__BUILDPATH__/g, buildPath);
        fs.writeFileSync(path + targetPath +  '/export.sh', script, 'utf8');
        out.stdout(script);
        executor.exec('sh export.sh ' + system.namespace + ' ' + containerDef.specific.targetName, path + targetPath, out, function() {
          out.progress();
          fse.remove(path + '/container.sh', function() {
          _docker.findImage(system.namespace + '/' + targetName + '-' + containerDef.specific.buildHead, function(err, image) {
            cb(err, {dockerImageId: image.Id,
                     containerBinary: buildPath + '/' + targetName + '-' + containerDef.specific.buildHead,
                     dockerLocalTag: system.namespace + '/' + targetName + '-' + containerDef.specific.buildHead,
                     buildNumber: containerDef.specific.buildHead});
            });
          });
        });
      });
    });
  };



  /**
   * construct the builder
   */
  var construct = function() {
    _docker = require('../../../util/docker')();
  };



  construct();
  return {
    build: build,
  };
};


