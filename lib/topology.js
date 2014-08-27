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
/*
 * Deployment:
 *
 * We have a history of changes and a flag in that history that denotes the 
 * currently deployed state of the system. Deploy will always deploy from the system
 * definition that is held in the head revision, i.e. head will be ahead of the
 * deployed system
 */

'use strict';

var _ = require('underscore');



/**
 * container abstraction
 */
module.exports = function() {
  var _topology;



  var load = function(root) {
    _.each(root.topology(), function(container) {

      container._impl = root.containerDefByDefId(container.containerDefinitionId);
      if (container.id === container.containedBy) {
        // root container
      }
      else {
        // this is contained by impl
        var containedBy =  root.containerById(container.containedBy);
        if (containedBy) {
          container.containedBy = containedBy;
        }
      }

      var contains = [];
      _.each(container.contains, function(cid) {
        var linkTo = root.containerById(cid);
        if (linkTo) {
          contains.push(linkTo);
        }
      });
      container.contains = contains;
    });
    _topology = root.topology();
    return _topology;
  };



  var diff = function() {
  };



  var analyze = function() {
  };



  var deploy = function() {
  };



  var construct = function() {
  };



  var recurseDumpTopology = function(node, out, depth) {
    var pad = '';
    var str;

    for (var idx = 0; idx < depth; ++idx) {
      pad += '        ';
    }
    str = node._impl.stringify();
    str = str.replace(/^/g, pad);
    str = str.replace(/\n/g, '\n' + pad);
    out.stdout(str);
    _.each(node.contains, function(contain) {
      recurseDumpTopology(contain, out, depth + 1);
    });
  };



  var dumpTopology = function(out) {
    var root = _.find(_topology, function(c) { return c.id === c.containedBy; });
    recurseDumpTopology(root, out, 0);
  };



  construct();
  return {
    load: load,
    diff: diff,
    analyze: analyze,
    deploy: deploy,
    dumpTopology: dumpTopology
  };
};

