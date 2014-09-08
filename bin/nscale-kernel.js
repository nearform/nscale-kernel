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

'use strict';

var forever = require('forever-monitor'),
		path 		= require('path');

var opts = require('yargs')
            .usage('Usage: $0 --config="config file" --test')
            .alias('c', 'config')
            .alias('t', 'test')
            .demand(['c'])
            .argv;

var kernelScript = path.resolve(__dirname, '../bin/nscale-kernel-boot.js');

var child = new (forever.Monitor)(kernelScript, {
  max: 3,
  silent: false,
  options: ['-c', opts.config]
});

child.on('exit', function () {
  console.log('nscale kernel has exited after 3 restarts');
});

child.start();
