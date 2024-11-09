# server-manager-service

Provides server information and management functions such as restart and update.
The intent is to call docker commands based on information stored completely within the service.

### Requirements

```sh
# Docker is required to run the application.
docker --version
Docker version 27.3.1, build v27.3.1

# The rest of these are only required to write code.
node --version
v20.17.0

# If you want to make pull requests you will also need redocly
# Redocly is used to combine the Swagger spec in to a single file so that
# it can be easily imported or used by more tools, such as Insomnia.
redocly --version
1.25.9

# The service currently depends on a docker bridge network with the name server-manager-service-network.
# Here is an example of how to create such a network.
docker network create \
  --driver=bridge \
  --subnet=172.19.0.0/16 \
  --ip-range=172.19.0.0/16 \
  --gateway=172.19.5.254 \
  -o enable_icc=true \
  server-manager-service-network
```

### How To Get This Running (Deployment)

**Make sure to update the /path/to and the HOST**

These commands are safe to repeat.

```sh
(
  cp docker/deployment/Dockerfile .
  cp docker/deployment/start-server-manager-service-server.sh .
  docker stop server-manager-service
  docker rm server-manager-service
  docker build -t server-manager-service --no-cache .
  docker run --name=server-manager-service -d \
  -p 3000:3000/udp \
  -p 3000:3000/tcp \
  -v /path/to/server-manager-service/prisma/db:/server-manager-service/prisma/db \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --restart unless-stopped \
  --network server-manager-service-network \
  --env LOG_LEVEL="info" --env HOST="PUT_YOUR_DEPLOYMENT_HOST_IP" --env PORT="3000" --env DATABASE_URL="file:./db/dev.db" \
  server-manager-service
)
```

### How to Install

This is only required if you want to work on the code or look at the code without type errors showing.

```sh
(
  npm install

  # Non-NixOS
  npx prisma generate

  # NixOS
  nix-shell --run "npx prisma generate"
)
```

### How to Get This Running (Development)

This service is designed to be run in a docker container and these instructions assume you wish to follow that design.
Make sure to update the /path/to.
These commands can be repeated to build a new container with any new changes.

```sh
(
  cp docker/development/Dockerfile .
  cp docker/development/start-server-manager-service-server.sh .
  docker stop server-manager-service
  docker rm server-manager-service
  docker build -t server-manager-service --no-cache .
  docker run --name=server-manager-service -d \
  -p 3000:3000/udp \
  -p 3000:3000/tcp \
  -v /path/to/server-manager-service/prisma:/server-manager-service/prisma \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --restart unless-stopped \
  --network=server-manager-service-network \
  --env LOG_LEVEL="trace" --env HOST="localhost" --env PORT="3000" --env DATABASE_URL="file:./db/dev.db" \
  server-manager-service
)
```

### Manual Testing

To make trying the service out easier the service provides a Swagger spec at /swagger. So, if you were running this locally for instance, you could browse to http://localhost:3000/swagger to see and interact with the APIs.
Additionally, there is a combined Swagger spec at swagger/combinedServerManagerService.yaml which can be used with many tools including to be imported in to Insomnia.

If your local database becomes a mess you can wipe it out with this command.

```sh
npx prisma migrate reset
```

### File Ownership Issue

When running this service in docker the generated files in prisma/ will belong to root:root. If this is ever annoying you can change the owner by using this command or one like it.

```sh
sudo chown "$USER":users -R prisma
```

### Database

The database files will be created in server-manager-service/prisma/db.
If you want to keep the db folder safe outside of the repo, then move the db folder to the new location and make a symlink to the the db folder's new home.

```sh
mv /path/to/server-manager-server/prisma/db /new/path/to/db
ln -snf /new/path/to/db /path/to/server-manager-service/prisma/db
```

### To Do

- Make network name configurable (and optional)
- Make restart policy configurable (and optional)
- Input validation in controllers.
- Probaby add integration tests. Right now it is all unit tests.
- Creating a port for a non-existent server is 500 instead of 404.
