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

var aws = require('aws-sdk');
aws.config.update({region:'eu-west-1'});

/*
 * preperties that can be set on the container ami - definition
 * similar to the create / launch wizzard

  "region": "eu-west-1",                - gloabal configuration for this management server
  "keyName": "keyname",                 - global configuration 
  "ami-id": "",                         - set on container add
  "tags": {"name": "wibble"},           - set on container add
  "securityGroups": ["sg-1", "sg-2"],   - set on container add
  "subnetId": "wibble",                 - must be set here which means that we may need to repeat the ami ID 
                                          across multiple container defs - which is OK
  "placement":                          - e.g. {alg: roundRobin, placein: [a,b,c]}
  "instance type"                       - again must be set here... see subnet id

 * properties that can be set on the instance - i.e. on spin up / deploy / instance start

  "ipaddress": "10.74.143.152",                   - set after start
  "placement": "1a",                              - set after start
  "instanceId": ...                               - set after start
 */

/**
 * deploy commands for demo - docker only
 */
module.exports = function(mode) {
  var _ec2;


  var add = function(targetHost, system, containerDef, container, out, cb) {
    cb();
  };



  var start = function(targetHost, system, containerDef, container, out, cb) {
    var newInstances = [];
    var params = {ImageId: containerDef.specific.amiid,
                  MinCount: 1,
                  MaxCount: 1,
                  KeyName: system.keyName,
                  SecurityGroupIds: containerDef.specific.securityGroupIds,
                  Monitoring: { Enabled: true },
                  InstanceType: containerDef.specific.instanceType};

    if ('preview' === mode) {
      params.DryRun = true;
    }
    if (containerDef.specific.subnetId) {
      params.SubnetId = containerDef.specific.subnetId;
    }
    if (containerDef.specific.placement) {
      params.Placement = containerDef.specific.placement;
    }

    _ec2.runInstances(params, function(err, data) {
      if (err) { return cb(err, null); }
      _.each(data.Instances, function(instance) {
        var instanceId = instance.InstanceId;
        var params = {Resources: [instanceId], Tags: [{Key: 'Name', Value: 'test'}]};
        _ec2.createTags(params, function() {});
          newInstances.push({InstanceId: instance.InstanceId});
        });
      cb(err, newInstances);
    });
  };




  var link = function(targetHost, system, containerDef, container, out, cb) {
    cb();
  };



  var unlink = function(targetHost, system, containerDef, container, out, cb) {
    cb();
  };



  var stop = function(targetHost, system, containerDef, container, out, cb) {
    cb();
  };



  var remove = function(targetHost, system, containerDef, container, out, cb) {
    cb();
  };



  var construct = function() {
    _ec2 = new aws.EC2();
  };



  construct();
  return {
    add: add,
    start: start,
    link: link,
    unlink: unlink,
    stop: stop,
    remove: remove
  };
};

