#!/bin/bash
# nfd docker build script
# parameters -
#   $1 namespace
#   $2 target name
#   $3 full docker command line
#
# sudo docker run -e REGION=__REGION__ -e NODE_ENV=production -p 3500:3000 -dns 127.0.0.1 -v /home/ubuntu/log/3500:/var/log -d __REPOSITORY__:5000/screenplay /src/run.sh
#

sudo docker stop $(sudo docker ps -q | grep $2)
sleep 10
echo cleaning...
sudo docker ps -a -notrunc | grep 'Exit' | awk '{print $1}' | xargs -r sudo docker rm
sudo docker images -notrunc| grep none | awk '{print $3}' | xargs -r sudo docker rmi

echo running... 
sudo docker run $3

