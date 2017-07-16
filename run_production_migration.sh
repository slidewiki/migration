#!/bin/bash

PRJ=$1

docker run \
  --name mysql
  --network=$PRJ\_front-trier \
  -e MYSQL_ROOT_PASSWORD=linuxisgreat \
  -e MYSQL_DATABASE=slidewiki \
  -v sql_dump:/docker-entrypoint-initdb.d
  -d mysql

docker run \
  --name slidewiki_migration
  --network=$PRJ\_front-trier \
  --link mysql
  --link $PRJ\_mongodb_1
  -it slidewiki/migration:latest




  
