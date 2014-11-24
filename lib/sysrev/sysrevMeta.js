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

var path = require('path');
var _ = require('lodash');
var fs = require('fs');
var git = require('./gitutil');



/**
 * maintains system repository conaining system meta information
 * maintains system commit log and history using nodegit
 * uses master branch only
 * need to be able to create a new repo on demand - for new system definition
 */
module.exports = function(options) {
  /**
   * turn a dir name with .git at the end into a system name (with the .git
   * removed)
   */
  var repoDirNameToSystemName = function(repoDirName) {
    return repoDirName.replace(/\.git$/, '');
  };



  /**
   * list all systems
   */
  var listSystems = function() {
    return fs.readdirSync(options.systemsRoot).map(function (file) {
      return {
        name: repoDirNameToSystemName(file)
      };
    });
  };



  /**
   * convert identifier into full system guid using:
   * 1) exact match on key
   * 2) partial match on key
   * 3) partial match on name
   */
  var findSystem = function(identifier) {
    var re = new RegExp('^' + identifier + '.*', ['i']);
    var systemId;
    var systems = listSystems();

    systemId = _.find(systems, function(system) { return system.name === identifier; });

    if (!systemId) {
      systemId = _.find(systems, function(system) { return re.test(system.name); });
    }

    return systemId;
  };



  var systemExists = function(name) {
    return fs.existsSync(path.join(options.systemsRoot, name + '.git'));
  };



  return {
    listSystems: listSystems,
    findSystem: findSystem,
    systemExists: systemExists
  };
};

