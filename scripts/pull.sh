#!/bin/sh
cd ../../nfd-api
git pull
cd ../nfd-client
git pull
cd ../nfd-kernel
git pull
cd ../nfd-sdk
git pull
cd ../nfd-timeline
git pull
cd ../viking
git pull

rm ./node_modules/nfd-protocol
rm ./node_modules/nfd-protocol
npm install
