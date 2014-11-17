var http = require('http');
var pushover = require('pushover');

module.exports = function(options, api, logger) {
  var repos = pushover(options.kernel.systemsRoot);
  repos.on('push', function(push) {
    logger.info('push to ' + push.repo + '/' + push.commit);
    push.accept();
  });

  repos.on('fetch', function(fetch) {
    logger.info('fetch from ' + fetch.repo + '/' + fetch.commit);
    fetch.accept();
  });

  var server = http.createServer(repos.handle.bind(repos));
  server.listen(options.git.port);
};
