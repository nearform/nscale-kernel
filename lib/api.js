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


module.exports = function(systems, options) {

  /**
   * list all of the available systems
   */
  var listSystems = function() {
    var result = [];
    _.each(systems, function(system) {
      result.push({name: system.root.name, id: system.root.id});
    });
    return result;
  };



  /**
   * list all of the available containers in a system
   */
  var listContainers = function(systemId) {
    var sys = _.find(systems, function(system) { return system.root.id === systemId; });
    if (!sys) {
      sys = {err: 'no such system'};
    }
    return sys;
  };


  /**
   * build a container
   */
  var buildContainer = function(systemId, containerId) {

  }





  var construct = function() {
  };



  construct();
  return {
    listSystems: listSystems,
    listContainers: listContainers
  };
};


