#!/usr/bin/env bash

HOST_IP=192.168.70.234

docker run -d -p 3001:3000 \
  --env HOSTNAME=$HOST_IP \
  --env LISTEN_PORT=3001 \
  --env REGISTER=$HOST_IP \
  --restart="always" \
  --name acme-hue \
  acme-hue