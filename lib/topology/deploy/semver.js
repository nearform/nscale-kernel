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
var semver = require('semver');



/**
 * semantic version checking for containers
 */
module.exports = function() {

  

  var checkDep = function(system, cdef, condition, containerName) {
    var container = _.find(system.containerDefinitions, function(def) { return def.name === containerName; });

    console.log('--------------------------');
    console.log(containerName);
    console.log(container.version);
    console.log(condition);
    console.log('--------------------------');

    return {result: semver.satisfies(container.version, condition), container: cdef.name, depends: containerName, condition: condition};
  };



  var checkDeps = function(system, cdef) {
    var result  = [];
    _.each(cdef.dependencies, function(dep, key) {
      result.push(checkDep(system, cdef, dep, key));
    });
    return result;
  };



  /**
   * check version constraints on all container definintions.
   * for now just checking 
   */
  var check = function(system) {
    var results = [];
    var good = true;
    _.each(system.containerDefinitions, function(cdef) { if (cdef.type === 'docker') {
        if (cdef.dependencies) {
          results = results.concat(checkDeps(system, cdef));
        }
      }
    });
    _.each(results, function(r) {
      if (!r.result) {
        good = false;
      }
    });
    return {check: good, results: results};
  };



  return {
    check: check,
  };
};

