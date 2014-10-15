'use strict';

module.exports = function(logger) {
  function log(arg) {
    logger.info(arg);
  }

  return {
    progress: log,
    stdout: log,
    stderr: log
  };
};
