#!/bin/bash
sudo docker build -t __NAMESPACE__/__TARGETNAME__-__BUILDNUMBER__ .
TMPID=$(sudo docker run -d __NAMESPACE__/__TARGETNAME__-__BUILDNUMBER__ /bin/bash)
sudo docker export $TMPID > __BUILDPATH__/__TARGETNAME__-__BUILDNUMBER__

