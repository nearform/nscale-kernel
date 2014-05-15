#!/bin/sh
#mkdir ../../log

killall node

cd ../lib
nohup node main.js > ../../log/nfd-kernel.log 2>&1 &

cd ../../nfd-api
nohup node server.js > ../log/nfd-api.log 2>&1 &

cd ../nfd-timeline
nohup node server.js > ../log/nfd-timeline.log 2>&1 &

cd ../viking/web
nohup node index.js > ../../log/web.log 2>&1 &

ps aux | grep -i node
tail -f ../../log/*

