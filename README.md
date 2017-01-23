# SlideWiki database migration development environment

This is the development environment for the SlideWiki Database Migration Tools. For convenience it features PHPMyAdmin and Mongo-Express. An SQL dump can be loaded automatically on startup. The MongoDB data is writen to a directory on the host system so it survives destruction of the migration image.

## How to run it

1. execute `build.sh` to build the migration image
2. execute `run.sh` to start all containers and enter an interactive shell of the migration container
3. inside the migration container run `grunt execute`

> NOTE: The MySQL server needs some time to initialize and load the SQL dump (depending on the size of the dump). If `grunt execute` throws an error that it failed to connect to the MySQL wait for a minute or two and try again. You can also look at the log output of the MySQL server and see if it is done initializing by executing `docker logs mysql`. The server is ready when you see the following lines:

```
2017-01-23T11:55:06.140154Z 0 [Note] mysqld: ready for connections.
Version: '5.7.17'  socket: '/var/run/mysqld/mysqld.sock'  port: 3306  MySQL Community Server (GPL)
```

## UIs for Database Management

PHPMyAdmin and Mongo-Express can be reached via localhost:

- Mongo-Express: [http://localhost:8081](http://localhost:8081)
- PHPMyAdmin: [http://localhost:8082](http://localhost:8082)

## The build.sh script

The `build.sh` (re-)builds the migration image. Before building it deletes the old migration image if existing.

## The run.sh script

The `run.sh` script runs docker-compose to set up all the container. Then it runs an interactie shell session of the migration image. When the migration image exits all containers are removed by docker-compose.

## Volumes

There are several directories that are mounted as volumes inside the running containers.

### `src` 

Source code of the actual migration script. The contents of the `/src` directory are monuted into the migration container on startup. That means that changes to the script are immediately available inside the container once a file is saved. Hence there is no need to re-start the container when some of the javascript is changed. You can simply run `grunt execute` inside the container again.


### `sql_dump`

Any `.sql` files that are present in this folder are executed against the database 'slidewiki' by the MySQL on startup. So this is the place where to put SlideWiki SQL dump.

### `shared`

This directory is available in all containers as `/shared`. It can be used to copy files between containers and host system.

### mongo_data

This directory holds the actual data of the MongoDB. Hence the data base is still there when you stop everything and run it another time. To reset the MongoDB simply delete all files in `/mongo_data`.


