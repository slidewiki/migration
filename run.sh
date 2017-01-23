#/bin/bash

echo "---  Setting up containers"
docker-compose up -d

sleep 4

echo "---  Starting migration container interactive shell:"
docker-compose run --rm migration /bin/bash

echo "---  Cleaning up"
docker-compose down

