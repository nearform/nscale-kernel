#! /usr/bin/env node

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
 * nfd kernel
 * node nfd-kernel.js --config='config file' --plugins='plugins file'
 */

'use strict';

var opts = require('yargs')
            .usage('Usage: $0 --config="config file" --plugins="plugins file"')
            .alias('c', 'config')
            .alias('P', 'plugins')
            .demand(['c'])
            .argv

var path = require('path')
var srv = require('nfd-protocol');
var loader = require('../lib/loader');
var config = require(path.resolve(opts.config));
var auth = require('nfd-auth')();
var logger = require('bunyan').createLogger({ name: 'nfd-kernel' });

console.log('loading...');
loader.boot(config, null, function(err, sysrev) {
  console.log('starting server...');
  var api = require('../lib/api')(config, sysrev);
  srv(api, auth, logger).start();
});

