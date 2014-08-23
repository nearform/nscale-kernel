#!/bin/sh
#mkdir ../../log

killall node

cd ../bin
nohup forever nfd-kernel.js --config ../default-config.json > ../../log/nfd-kernel.log 2>&1 &

cd ../../nfd-api
nohup forever server.js > ../log/nfd-api.log 2>&1 &

#cd ../viking/web
#nohup forever index.js > ../../log/web.log 2>&1 &

cd ../nfd-web
nohup forever server.js > ../log/web.log 2>&1 &

#cd ../nfd-mobile
#nohup forever app.js > ../log/mobile.log 2>&1 &

ps aux | grep -i node
tail -f ../log/*

