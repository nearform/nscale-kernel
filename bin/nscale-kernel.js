#!/usr/bin/env node
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
var fs = require('fs');
var path = require('path');
var opts = require('yargs')
            .usage('Usage: $0 --config="config file" --test')
            .alias('c', 'config')
            .alias('t', 'test')
            .demand(['c'])
            .argv;

var config = require(path.resolve(opts.config));
var Kernel = require('../lib/kernel');
config.test = opts.test;
var pidFile = path.join(config.kernel.root, 'data', '.nscale-kernel');

var kernel = new Kernel(config, function(err) {
  if (err) {
    // this is needed to get out of the nodegit promise
    // context
    process.nextTick(function () {
      throw err;
    });
    return
  }
  kernel.start();

  fs.writeFile(pidFile, process.pid, function(err) {
    if (err) { throw err; }
  });
});

process.on('exit', function(code) {
  if (fs.existsSync(pidFile)) { fs.unlinkSync(pidFile); }
});

var signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];

signals.forEach(function(signal) {
  process.on(signal, function() {
    kernel.stop();
  });
});
