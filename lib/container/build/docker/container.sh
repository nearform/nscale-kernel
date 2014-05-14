#!/bin/bash
# nfd docker build script
# parameters -
#   $1 namespace
#   $2 target name

sudo docker build -t $1/$2 .

# export and import to flatten the image
TMPID=$(sudo docker run -d $1/$2 /bin/bash)
sudo docker export $TMPID > /tmp/$TMPID
sudo cat /tmp/$TMPID | sudo docker import - $1/$2

# push to the container registry - on this system
DOCKERID=`sudo docker images | grep  '^$1\/$2 ' | grep latest | awk -v x=3 '{print $x}'`
#sudo docker tag $DOCKERID nearform/screenplay_$bn
sudo docker tag $DOCKERID localhost.localdomain:5000/$2
sudo docker push localhost.localdomain:5000/$2

# cleandown
DOCKERTMPID=`sudo docker images | grep  '^$2\/screenplaytmp ' | grep latest | awk -v x=3 '{print $x}'`
sudo docker rmi $SCREENPLAYTMPID
sudo docker ps -a -notrunc | grep 'Exit' | awk '{print $1}' | xargs -r sudo docker rm
sudo docker images -notrunc| grep none | awk '{print $3}' | xargs -r sudo docker rmi





















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





#!/bin/bash
# build and update screenplay container, push updates to registry

# clean down the deployment folder
rm -rf ~/build/screenplay
mkdir -p ~/build/screenplay/screenplay

# get latest 
cd ~/src/screenplay-2/
git pull 
#git checkout alt

# copy in code and dockerfile
cp -r ~/src/screenplay-2/. ~/build/screenplay/screenplay
cp ~/devops/docker/screenplay/Dockerfile ~/build/screenplay/
cp ~/devops/scripts/build/screenplay/run.sh ~/build/screenplay/screenplay

# set dnsmasq nameserver
if [ "$FANDANGO_REGION" = "us-east-1" ]
then
  sed -i '/__WEST__/d' ~/build/screenplay/Dockerfile
  sed -i '/__WEST2__/d' ~/build/screenplay/Dockerfile
  sed -i 's/__EAST__//' ~/build/screenplay/Dockerfile
elif [ "$FANDANGO_REGION" = "us-west-2" ]
then
  sed -i '/__EAST__/d' ~/build/screenplay/Dockerfile
  sed -i '/__WEST__/d' ~/build/screenplay/Dockerfile
  sed -i 's/__WEST2__//' ~/build/screenplay/Dockerfile
else
  sed -i '/__EAST__/d' ~/build/screenplay/Dockerfile
  sed -i '/__WEST2__/d' ~/build/screenplay/Dockerfile
  sed -i 's/__WEST__//' ~/build/screenplay/Dockerfile
fi

# temp build - this will come from the build server
cd ~/build/screenplay/screenplay
npm install
bower install
grunt build
chmod 755 ~/build/screenplay/screenplay/dist/run.sh

# get current latest
CURRENTID=`sudo docker images | grep -i nearform/screenplay | grep latest | awk -v x=3 '{print $x}'`

# set build number
bn=`cat ~/devops/scripts/build/screenplay/bn.txt`
bn=`expr $bn + 1`
echo $bn > ~/devops/scripts/build/screenplay/bn.txt

# build the layer
cp ~/build/screenplay/Dockerfile ~/build/screenplay/screenplay/dist/
cd ~/build/screenplay/screenplay/dist
sudo docker build -t nearform/screenplaytmp .

# export and import to flatten the image
TMPID=$(sudo docker run -d nearform/screenplaytmp /bin/bash)
sudo docker export $TMPID > /tmp/$TMPID
sudo cat /tmp/$TMPID | sudo docker import - nearform/screenplay

# push to the container registry - on this system
SCREENPLAYID=`sudo docker images | grep  '^nearform\/screenplay ' | grep latest | awk -v x=3 '{print $x}'`
sudo docker tag $SCREENPLAYID nearform/screenplay_$bn
sudo docker tag $SCREENPLAYID localhost.localdomain:5000/screenplay
sudo docker push localhost.localdomain:5000/screenplay

# cleandown
SCREENPLAYTMPID=`sudo docker images | grep  '^nearform\/screenplaytmp ' | grep latest | awk -v x=3 '{print $x}'`
sudo docker rmi $SCREENPLAYTMPID
sudo docker ps -a -notrunc | grep 'Exit' | awk '{print $1}' | xargs -r sudo docker rm
sudo docker images -notrunc| grep none | awk '{print $3}' | xargs -r sudo docker rmi


