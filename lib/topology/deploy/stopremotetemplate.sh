ssh -i ~/nfd.pem ubuntu@__TARGETHOST__ <<'ENDSSH'
echo stopping... 
sudo docker stop $(sudo docker ps | grep __TARGETNAME__ | awk '{print $1}')
ENDSSH

