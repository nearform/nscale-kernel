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



/**
 * container abstraction
 */
module.exports = function(options) {
  var _system;



  var load = function(system) {
    _system = system;
  };



  var containerDefByDefId = function(containerDefId) {
    var c = _.find(_system.containerDefinitions, function(containerDef) { return containerDef.id === containerDefId; });
    return c;
  };



  var containerDefById = function(containerId) {
    var container = _.find(_system.topology.containers, function(container) { return container.id === containerId; });
    return containerDefByDefId(container.containerDefinitionId);
  };



  var containerById = function(containerId) {
    var container = _.find(_system.topology.containers, function(container) { return container.id === containerId; });
    return container;
  };



  var topology = function() {
    return _system.topology.containers;
  };



  var dumpContainerDefs = function(out) {
    _.each(_system.containerDefinitions, function(containerDef) {
      out.stdout(containerDef);
    });
  };



  return {
    load: load,
    topology: topology,
    dumpContainerDefs: dumpContainerDefs,
    containerDefByDefId: containerDefByDefId,
    containerDefById: containerDefById,
    containerById: containerById
  };
};


