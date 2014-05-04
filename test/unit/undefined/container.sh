#!/bin/bash
# nfd docker build script
# parameters -
#   $1 namespace
#   $2 target folder
#   $3 target name

sudo docker build -t $1/$3 .
TMPID=$(sudo docker run -d $1/$3 /bin/bash)
sudo docker export $TMPID > $2/$3

#ID=`sudo docker images | grep -i '^$1/nginx ' | grep latest | awk -v x=3 '{print $x}'`
#echo { result: 'ok', artefacts: { dockerImage: '$NGINXID' } } > $2/result.json
#sudo docker export 
#TMPID=$(sudo docker run -d nearform/screenplaytmp /bin/bash)
#sudo cat /tmp/$TMPID | sudo docker import - nearform/screenplay
#sudo docker tag $NGINXID localhost.localdomain:5000/nginx
#sudo docker push localhost.localdomain:5000/nginx

