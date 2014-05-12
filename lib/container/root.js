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
var absContainer = require('./container');



/**
 * container abstraction
 */
module.exports = function(options) {
  var _doc;
  var _containerDefs;



  var load = function(path) {
    _doc = require(path);
    _containerDefs = [];

    _.each(_doc.root.containerDefinitions, function(containerDef) {
      _containerDefs.push(absContainer.create(_doc.root, containerDef, options));
    });
  };



  var containerDefByDefId = function(containerDefId) {
    return _.find(_containerDefs, function(containerDef) { return containerDef.id === containerDefId; });
  };



  var containerDefById = function(containerId) {
    var container = _.find(_doc.root.topology.containers, function(container) { return container.id === containerId; });
    return containerDefByDefId(container.containerDefinitionId);
  };



  var containerById = function(containerId) {
    var container = _.find(_doc.root.topology.containers, function(container) { return container.id === containerId; });
    return container;
  };



  var topology = function() {
    return _doc.root.topology.containers;
  };



  var dumpContainerDefs = function(out) {
    _.each(_containerDefs, function(containerDef) {
      out.stdout(containerDef.stringify());
    });
  };



  var construct = function() {
  };



  construct();
  return {
    load: load,
    topology: topology,
    dumpContainerDefs: dumpContainerDefs,
    containerDefByDefId: containerDefByDefId,
    containerDefById: containerDefById,
    containerById: containerById
  };
};


