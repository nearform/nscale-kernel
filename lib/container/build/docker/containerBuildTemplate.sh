#!/bin/bash
sudo docker build -t __NAMESPACE__/__TARGETNAME__tmp .

# export and import to flatten the image
TMPID=$(sudo docker run -d $1/$2tmp /bin/bash)
sudo docker export $TMPID > /tmp/$TMPID
sudo cat /tmp/$TMPID | sudo docker import - __NAMESPACE__/__TARGETNAME__

# push to the container registry - on this system
#DOCKERID=`sudo docker images | grep  '^$1\/$2 ' | grep latest | awk -v x=3 '{print $x}'`
#sudo docker tag $DOCKERID nearform/screenplay_$bn
#sudo docker tag $DOCKERID localhost.localdomain:5000/$2
#sudo docker push localhost.localdomain:5000/$2

# cleandown
DOCKERTMPID=`sudo docker images | grep  '^__NAMESPACE__\/__TARGETNAME__tmp ' | grep latest | awk -v x=3 '{print $x}'`
sudo docker rmi $DOCKERTMPID
sudo docker ps -a -notrunc | grep 'Exit' | awk '{print $1}' | xargs -r sudo docker rm
sudo docker images -notrunc| grep none | awk '{print $2}' | xargs -r sudo docker rmi

