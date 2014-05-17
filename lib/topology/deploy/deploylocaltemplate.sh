#!/bin/bash
echo stopping... 
sudo docker stop $(sudo docker ps | grep __TARGETNAME__ | awk '{print $1}')
sleep 10
echo running...
sudo docker run __ARGUMENTS__

