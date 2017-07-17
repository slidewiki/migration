#!/bin/bash

PRJ=$1

docker run --name mysql \
        --network=$PRJ\_back-trier \
  -e MYSQL_ROOT_PASSWORD=linuxisgreat \
  -e MYSQL_DATABASE=slidewiki \
  -v $PWD/sql_dump:/docker-entrypoint-initdb.d \
  -d mysql

docker logs -f mysql

docker run --name slidewiki_migration --network=$PRJ\_back-trier --link mysql --link $PRJ\_mongodb_1 -it slidewiki/migration:latest /bin/bash
