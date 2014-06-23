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



/**
 * deploy commands for demo - docker only
 */
module.exports = function() {

  var add = function(targetHost, system, containerDef, container, out, cb) {
    cb();
  };



  var start = function(targetHost, system, containerDef, container, out, cb) {
    cb();
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

