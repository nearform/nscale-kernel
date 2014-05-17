#!/bin/bash
# nfd docker build script
# parameters -
#   $1 namespace
#   $2 target name
#   $3 docker command line parameters

echo stopping... 
sudo docker stop $(sudo docker ps -q | grep $2)
sleep 10

#echo cleaning...
#sudo docker ps -a -notrunc | grep 'Exit' | awk '{print $1}' | xargs -r sudo docker rm
#sudo docker images -notrunc| grep none | awk '{print $3}' | xargs -r sudo docker rmi

echo running...
#sudo docker run $3 -d $2/$1
sudo docker run $3

