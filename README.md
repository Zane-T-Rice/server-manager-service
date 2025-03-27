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

### Quick Notes

Many of the steps involve running npx to interact with prisma. On most distros this will probably work as written. On NixOS you can use the provided shell.nix to perform the exact same commands.

```sh
# On most distros
npx prisma studio

# On NixOS
nix-shell --run "npx prisma studio"
```

The npx commands require the DATABASE_URL environment variable is set. You can either set it on the command line before each command `DATABASE_URL="file:./db/dev.db" npx prisma studio` or in a .env file.

### How To Get This Running (Deployment)

**Make sure to update the /path/to and the HOST**

These commands are safe to repeat.

If you want to use these APIs from client-side javascript from a browser, then you will also need to set the WEBSITE_DOMAIN environment variable using --env just like the other environment variables.

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
  --env LOG_LEVEL="info" --env SWAGGER_HOST_AND_PORT="PUT_YOUR_DEPLOYMENT_HOST_IP" --env PORT="3000" --env DATABASE_URL="file:./db/dev.db" \
  server-manager-service
)
```

After the service is started the first time you will need to create an authorization key for your users. This must be done by directly connecting with the database, there is no route for managing authorization keys.

You can either use prisma studio and insert the record through the GUI or you can use the prisma/scripts/addAuthorizationKey.ts script after editing the script with the owner and value you want the key to have.

```sh
# Using the prisma studio GUI
npx prisma studio

# Using the prisma/scripts/addAuthorizationKey.ts script
npx ts-node prisma/scripts/addAuthorizationKey.ts
```

### How to Install

This is only required if you want to work on the code or look at the code without type errors showing.

```sh
(
  npm install
  npx prisma generate
)
```

### How to Get This Running (Development)

**Make sure to update the /path/to.**

This service is designed to be run in a docker container and these instructions assume you wish to follow that design.

These commands can be repeated to build a new container with any new changes.

If you want to use these APIs from client-side javascript from a browser, then you will also need to set the WEBSITE_DOMAIN environment variable using --env just like the other environment variables.

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
  -v /path/to/server-manager-service/prisma/db:/server-manager-service/prisma/db \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --restart unless-stopped \
  --network=server-manager-service-network \
  --env LOG_LEVEL="trace" --env SWAGGER_HOST_AND_PORT="localhost:3000" --env PORT="3000" --env DATABASE_URL="file:./db/dev.db" \
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

When running this service in docker the generated files in prisma/ will belong to root:root. This can block you from editing the database manually, but can be corrected like so:

```sh
sudo chown "$USER":users -R prisma
```

### Database

You can directy view and interact with the database in many ways. Prisma offers the prisma studio GUI and you can also make scripts following the examples in prisma/scripts.

```sh
# Prisma Studio GUI
npx prisma studio

# Running an ad-hoc script that interfaces with prisma.
npx ts-node prisma/scripts/listAuthorizationKeys.ts
```

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
- Docker with non-root user (mostly so the files it generates are not owned by root).
