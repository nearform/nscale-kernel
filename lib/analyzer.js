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

module.exports = function(logger, _anl) {

  var findVms = function(sdef) {
    var vms = [];
    _.each(sdef.topology.containers, function(c) {
      var def = _.find(sdef.containerDefinitions, function(cdef) { return cdef.id === c.containerDefinitionId; });
      if (def && (def.type === 'virtualbox' || def.type === 'aws-ami' || def.type === 'blank-container')) {
        vms.push(c);
      }
    });
    return vms;
  };



  var createCompareList = function(vms, sys) {
    var list = [];
    _.each(vms, function(vm) {
      _.each(vm.contains, function(c) {
        list.push({id: c,
                   containedBy: sys.topology.containers[c].containedBy,
                   dockerImageId: sys.topology.containers[c].specific.dockerImageId,
                   containerDefinitionId: sys.topology.containers[c].containerDefinitionId});
      });
    });
    return list;
  };



  /**
   * pull matching ids from the system definition into the analyzed system topology
   * only for docker type containers 
   */
  var matchTopologyIds = function(system, analyzed) {
    var svms = findVms(system);
    var avms = findVms(analyzed);
    var sysCompareList = createCompareList(svms, system);
    var anCompareList = createCompareList(avms, analyzed);

    _.each(anCompareList, function(an) {
      var sys = _.find(sysCompareList, function(sys) { return sys.dockerImageId === an.dockerImageId; });
      if (sys) {
        if (an.id !== sys.id && analyzed.topology.containers[an.id]) {
          var oldId = analyzed.topology.containers[an.id].id;
          analyzed.topology.containers[an.id].id = sys.id;
          analyzed.topology.containers[sys.id] = analyzed.topology.containers[an.id]; // deep copy ??
          delete analyzed.topology.containers[an.id];

          var nc = _.without(analyzed.topology.containers[an.containedBy].contains, oldId);
          nc.push(sys.id);
          analyzed.topology.containers[an.containedBy].contains = nc;
        }
      }
    });
    return analyzed;
  };



  /**
   * pull matching ids from the system definition into the analyzed system container definintions
   * and link up matching ids in topology section - only for docker type containers 
   */
  var matchCDefIds = function(system, analyzed) {
    var scdefs = _.filter(system.containerDefinitions, function(cdef) { return cdef.type === 'docker' || cdef.type === 'boot2docker'; });
    var acdefs = _.filter(analyzed.containerDefinitions, function(cdef) { return cdef.type === 'docker' || cdef.type === 'boot2docker'; });

    _.each(acdefs, function(an) {
      var sys = _.find(scdefs, function(scdef) { return scdef.specific.dockerImageId === an.specific.dockerImageId; });
      if (sys) {
        _.each(analyzed.topology.containers, function(c) {
          if (c.containerDefinitionId === an.id) {
            c.containerDefinitionId = sys.id;
          }
        });
        an.id = sys.id;
      }
    });
    return analyzed;
  };



  /**
   * ensure that any nodes that do not have a parent self reference
   */
  var checkRootNodeConsistency = function(analyzed) {
    _.each(analyzed.topology.containers, function(c) {
      if (!c.containedBy) {
        c.containedBy = c.id;
      }
    });
    return analyzed;
  };



  /*
  var system = require('/Users/pelger/work/nearform/code/product/nfd/nfd-client/rev5.json');
  var analyzed = require('/Users/pelger/work/nearform/code/product/nfd/nfd-client/anl6.json');
  var res = matchTopologyIds(system, analyzed);
  res = matchCDefIds(system, res);
  console.log(JSON.stringify(res, null, 2));
  */



  var analyze = function analyze(config, system, cb) {
    logger.info('running analysis');
    _anl.analyze(config, system, function(err, result) {
      if (err) { return cb(err); }
      logger.info('updating topology');
      result = matchTopologyIds(system, result);
      logger.info('updating container defs');
      result = matchCDefIds(system, result);
      logger.info('checking root node consistency');
      result = checkRootNodeConsistency(result);
      cb(err, result);
    });
  };


  return {
    analyze: analyze
  };
};


module.exports(null);

