#!/bin/bash
# nfd docker build script
# parameters -
#   $1 namespace
#   $2 target folder
#   $3 target name

ssh -i ~/.ssh/id_rsa_int ubuntu@$1 <<'ENDSSH'
mkdir -p /home/ubuntu/log/nginx
mkdir -p /home/ubuntu/log/3500
mkdir -p /home/ubuntu/log/3501
mkdir -p /home/ubuntu/log/3502
mkdir -p /home/ubuntu/log/3503
mkdir -p /home/ubuntu/log/3504
mkdir -p /home/ubuntu/log/3505
mkdir -p /home/ubuntu/log/3506
mkdir -p /home/ubuntu/log/3507
sudo docker stop $(sudo docker ps -q)
sleep 10
echo cleaning...
sudo docker ps -a -notrunc | grep 'Exit' | awk '{print $1}' | xargs -r sudo docker rm
sudo docker images -notrunc| grep none | awk '{print $3}' | xargs -r sudo docker rmi
echo pulling latest... 
sudo docker pull __REPOSITORY__:5000/nginx
sudo docker pull __REPOSITORY__:5000/screenplay
sudo docker ps -a -notrunc | grep 'Exit' | awk '{print $1}' | xargs -r sudo docker rm
sudo docker images -notrunc| grep none | awk '{print $3}' | xargs -r sudo docker rmi
echo running... 
HOSTIP=$(/sbin/ifconfig eth0 | grep "inet addr" | awk -F: '{print $2}' | awk '{print $1}')
sudo docker run -e REGION=__REGION__ -e NODE_ENV=production -p 3500:3000 -dns 127.0.0.1 -v /home/ubuntu/log/3500:/var/log -d __REPOSITORY__:5000/screenplay /src/run.sh
sudo docker run -e REGION=__REGION__ -e NODE_ENV=production -p 3501:3000 -dns 127.0.0.1 -v /home/ubuntu/log/3501:/var/log -d __REPOSITORY__:5000/screenplay /src/run.sh
sudo docker run -e REGION=__REGION__ -e NODE_ENV=production -p 3502:3000 -dns 127.0.0.1 -v /home/ubuntu/log/3502:/var/log -d __REPOSITORY__:5000/screenplay /src/run.sh
sudo docker run -e REGION=__REGION__ -e NODE_ENV=production -p 3503:3000 -dns 127.0.0.1 -v /home/ubuntu/log/3503:/var/log -d __REPOSITORY__:5000/screenplay /src/run.sh
sudo docker run -e NODE_CONTAINER_1=$HOSTIP -e NODE_CONTAINER_2=$HOSTIP -p 80:80 -d __REPOSITORY__:5000/nginx
ENDSSH

#sudo docker run -e NODE_CONTAINER_1=$HOSTIP -e NODE_CONTAINER_2=$HOSTIP -p 80:80 -v /home/ubuntu/log/nginx:/var/log -d __REPOSITORY__:5000/nginx
#sudo docker images -notrunc| grep none | awk '{print $3}' | xargs -r sudo docker rmi
#sudo docker ps -a -notrunc | grep 'Exit' | awk '{print $1}' | xargs -r sudo docker rm
#sudo docker run -e REGION=__REGION__ -e NODE_ENV=production -p 3504:3000 -dns 127.0.0.1 -v /home/ubuntu/log/3504:/var/log -d __REPOSITORY__:5000/screenplay
#sudo docker run -e REGION=__REGION__ -e NODE_ENV=production -p 3505:3000 -dns 127.0.0.1 -v /home/ubuntu/log/3505:/var/log -d __REPOSITORY__:5000/screenplay
#sudo docker run -e REGION=__REGION__ -e NODE_ENV=production -p 3506:3000 -dns 127.0.0.1 -v /home/ubuntu/log/3506:/var/log -d __REPOSITORY__:5000/screenplay
#sudo docker run -e REGION=__REGION__ -e NODE_ENV=production -p 3507:3000 -dns 127.0.0.1 -v /home/ubuntu/log/3507:/var/log -d __REPOSITORY__:5000/screenplay




