#__name__

Holds the container definitions and system topolgy. Generated and managed by nscale.

## overview
The following files are used by nscale for system management.

### system.js

```js
exports.name = 'nscaledemo';
exports.namespace = 'nscaledemo';
exports.id = 'e1144711-47bb-5931-9117-94f01dd20f6f';

exports.topology = {
  development: {
    root: ['web']
  }
};
```

Defines the system namespace, name and id. Also defines a simple topology for local deployment.


### definitions/services.js

```
exports.root = {
    type: 'blank-container'
};

exports.web = {
  type: 'docker',
  specific: {
      repositoryUrl: 'git@github.com:nearform/nscaledemoweb.git',
      execute: {
          args: '-p 8000:8000 -d',
          exec: '/usr/bin/node index.js'
      }
    }
};
```

Defines a root container and a web container to hold the hello world application.

### generated files

The `<environment>.json` contains the compiled system definition, build from system.js and related files, for the environment. In this example it will produce only `development.json`, to add more add siblings to the `development` key in `system.js`.

## configuration file

The project includes a `config.example.js` file for you to customize.
Rename it as `config.js` to let nscale load it.

```bash
cp config.example.js config.js
```

The `config.js` will __not be committed__, as it is included in the `.gitignore`.
We recommend you to ignore also your key and pem files, so that they are
not included in the git repository.
