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

var _ = require('lodash');
var uuid = require('uuid');



/**
 * container builder
 */
module.exports = function(config, _containers) {

  var logger = config.logger;

  var updateTopology = function(json, containerDef, container) {
    var prnt = json.topology.containers[container.containedBy];
    var newId = uuid.v4();
    var oldId = container.id;
    var idx;

    if (!prnt) {
      // Root container, bail out.
      return;
    }

    if (-1 !== (idx = prnt.contains.indexOf(oldId))) {
      prnt.contains[idx] = newId;
    }
    json.topology.containers[oldId].id = newId;

    json.topology.containers[newId] = json.topology.containers[oldId];
    delete json.topology.containers[oldId];
  };



  /**
   * Build the container and update all instantiations of the container 
   * with the new speicific block and replace identifiers for new uuids
   */
  var build = function build(mode, system, cdef, out, cb) {
    var err = 'no matching container available for type: ' + cdef.type;
    var container = _containers[cdef.type];

    out.progress('--> executing container specific build');
    logger.info('executing container specific build');
    if (!container) { logger.error(err); return cb(err); }
    container.build(mode, system, cdef, out, function(err, specific) {
      if (err) { logger.error(err); out.stdout(err); return cb(err); }

      out.progress('--> updating topology');
      logger.info('updating topology');

      var matches = _.filter(system.topology.containers, function(c) {
        return c.containerDefinitionId === cdef.id;
      });
      _.each(matches, function(ctnr) {
        ctnr.specific = specific;
        updateTopology(system, cdef, ctnr);
      });

      if (cdef.specific.buildHead) {
        cdef.specific.buildHead = cdef.specific.buildHead + 1;
      }
      cb(err, specific);
    });
  };



  return {
    build: build,
  };
};

