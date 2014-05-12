
  var recurseDumpTopology = function(container, out, depth) {
    out.stdout(container.stringify(depth));
    _.each(container.children, function(child) {
      recurseDumpTopology(child, out, depth + 1);
    });
  };


  /**
   * dump the container hierarchy
   */
  var dumpTopology = function(out) {
    /*
    console.log(_containerDefs);
    var rootContainer = _.find(_containerDefs, function(container) { console.log('--> ' + container.parent); return container.parent === null; });
    recurseDumpTopology(rootContainer, out, 0);
    */
    console.log(_topology.dump());
  };

  /**
   * build the container and its children
   *
   * create a target folder
   *
   * execute the build script (sh build.sh)
   *
   * copy results to target container build area
   *
   *   $1 - build path
   *   $2 - target path
   *   script will place outputs into target path including result.json
   *
   * execute the target specific build steps using the container references in _impl
   */
  var build = function(out, cb) {
    var targetPath = options.targetRoot + '/' + uuid.v4();

    out.stdout('create target folder: ' + targetPath);
    wrench.mkdirSyncRecursive(targetPath, 511);
    json.targetPath = targetPath;

    out.stdout('running build...');
    out.stdout(json.buildScript);

    executor(json, out, function(err) {
      if (err) { return cb(err); }

      out.stdout('running container build...');
      _impl.encapsulate(json, out, function(err) {
        cb(err);
      });
    });
  };




  var stringify = function(depth) {
    var prepend = '';
    for (var idx = 0; idx < depth; ++idx) {
      prepend += '  ';
    }
    var result = JSON.stringify(json, null, 2);
    result = result.replace(/^/g, prepend);
    result = result.replace(/\n/g, '\n' + prepend);
    return result;
  };
