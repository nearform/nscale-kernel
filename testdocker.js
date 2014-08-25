var Docker = require('dockerode');


var split = /tcp:\/\/([0-9.]+):([0-9]+)/g.exec(process.env.DOCKER_HOST);
console.log(split);
console.log(split[1]);
console.log(split[2]);
var url = 'http://' + split[1];
var port = split[2];


//var docker = new Docker({host: 'http://192.168.59.103', port: 2375});
var docker = new Docker({host: url, port: port});
docker.listImages(function(err, images) {
  console.log(err);
  console.log(images);
});

