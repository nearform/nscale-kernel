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
  var _containers;



  /**
   * TODO:
   */
  var serialize = function() {
  };



  /**
   * deserialize the containers and create objects
   */
  var deserialize = function(path) {
    _doc = require(path);
    _containers = [];

    // create containers
    _.each(_doc.root.containers, function(container) {
      _containers.push(absContainer.create(_doc.root, container, options));
    });

    // link containers
    _.each(_containers, function(container) {
      var childArray = [];

      _.each(container.children, function(childId) {
        var match = _.find(_containers, function(c) { return c.id === childId; });
        if (match) {
          childArray.push(match);
        }
      });
      container.children = childArray;

      var prnt = _.find(_containers, function(c) { return c.id === container.parent; });
      if (prnt) {
        container.parent = prnt;
      }
    });
  };



  var recurseDump = function(container, out, depth) {
    out.stdout(container.stringify(depth));
    _.each(container.children, function(child) {
      recurseDump(child, out, depth + 1);
    });
  };



  var containerById = function(id) {
    return _.find(_containers, function(container) { return container.id === id; });
  };




  /**
   * dump the container hierarchy
   */
  var dump = function(out) {
    var rootContainer = _.find(_containers, function(container) { console.log('--> ' + container.parent); return container.parent === null; });
    recurseDump(rootContainer, out, 0);
  };



  var construct = function() {
  };



  construct();
  return {
    serialize: serialize,
    deserialize: deserialize,
    containerById: containerById,
    dump: dump
  };
};


