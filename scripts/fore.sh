#!/bin/sh
#mkdir ../../log

killall node

cd ../lib
nohup forever main.js > ../../log/nfd-kernel.log 2>&1 &

cd ../../nfd-api
nohup forever server.js > ../log/nfd-api.log 2>&1 &

#cd ../viking/web
#nohup forever index.js > ../../log/web.log 2>&1 &

cd ../nfd-web
nohup forever server.js > ../log/web.log 2>&1 &

ps aux | grep -i node
tail -f ../log/*

