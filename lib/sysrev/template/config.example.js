module.exports = {

  // // configure how nscale checks out your projects
  // repositories: {
  //   // if you are checking out with HTTP and you need to specify a user/pass
  //   // decomment and customize those:
  //   user: "myuser",
  //   password: "mypass"

  //   // you can also specify a user/pass combination for each repo
  //   "https://mydomain.com/my/repo.git": {
  //     user: "myuser",
  //     password: "mypassword"
  //   }
  // },

  // // if you need to specify a ssh key for check out
  // // your project, configure it here:
  // sshKeyPath: "/path/to/ssh/key",

  // // configure AWS credentials
  // identityFile: "key.pem", // place your file alongside config.js
  // accessKeyId: "ABCDEF",
  // secretAccessKey: "GHI",
  // user: "myUsernameForAWS",
  // defaultVpcId: "vpc-xxxxxxxx",
  // defaultSubnetId: "subnet-xxxxxxxx",
  // region: "us-west-2",

  // // add a custom container type
  // // you will have to install it globally
  // containers: [{
  //   require: "mymodule",
  //   type: "mycontainer"
  // }],

  // // specify an analyzer
  // modules: {
  //   analysis: {
  //     require: 'nscale-direct-analyzer',
  //     specific: {
  //       user: "myuser",
  //       identityFile: "/path/to/certificate.pem"
  //     }
  //   }
  // },

  // // you can also define all the above for each target
  // development: {
  //   sshKeyPath: "/path/to/ssh/key
  // }
}
