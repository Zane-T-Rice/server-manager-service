# server-manager-service

Provides server information and management functions such as restart and update.
The intent is to call docker commands based on information stored completely within the service.

### Requirements

```sh
# Docker is required to run the application.
docker --version
Docker version 27.5.1, build v27.5.1

# The rest of these are only required to write code.
node --version
v22.14.0

# If you want to make pull requests you will also need redocly
# Redocly is used to combine the Swagger spec in to a single file so that
# it can be easily imported or used by more tools, such as Insomnia.
redocly --version
1.34.2

# The service currently depends on a docker bridge network with the name server-manager-service-network.
# Here is an example of how to create such a network. Any docker container on this network can be
# managed by server-manager-service.
docker network create \
  --driver=bridge \
  --subnet=172.19.0.0/16 \
  --ip-range=172.19.0.0/16 \
  --gateway=172.19.5.254 \
  -o enable_icc=true \
  server-manager-service-network
```

### Quick Notes

Many of the steps involve running npx to interact with prisma. On most distros this will probably work as written.
On NixOS, you will want to use the provided shell.nix to set some environment variables and then this should work
properly.

```sh
# On most distros
npx prisma studio

# On NixOS
nix-shell .
npx prisma studio
```

The npx commands require the DATABASE_URL environment variable is set. You can either set it on the command line before each command `DATABASE_URL="file:./db/dev.db" npx prisma studio` or in a .env file.

### How To Get This Running (Deployment)

**Make sure to update the /path/to and the HOST**

These commands are safe to repeat.

- WEBSITE_DOMAIN is needed if you want to use these APIs from client-side javascript in a browser.
- ISSUER is the domain that issues OAuth2.0 tokens. The service is configured for jwt bearer tokens made with the RS256 algorithm. AUDIENCE is the API Audience.
- The service uses the permissions "admin:servers" and "user:servers" to authorize users per route.

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
  -v /path/to/server-manager-service/prisma:/server-manager-service/prisma \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --restart unless-stopped \
  --network server-manager-service-network \
  --env LOG_LEVEL="info" --env PORT="3000" --env DATABASE_URL="file:./db/dev.db" \
  --env WEBSITE_DOMAIN="http://localhost:3100" --env HOST="http://localhost:3000" \
  --env AUDIENCE="" --env ISSUER="" --env TOKEN_SIGNING_ALG="RS256" \
  server-manager-service
)
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

You can run the service directly or inside of a Docker container.

```sh
# The environment variables that are needed are in the below Docker command prefixed by the --env flags.
# You can run the service by simply setting the environment variables in a .env file and then running
npm run start:dev

# If you want to use a Docker container instead, you can do the following.
# These commands will let you run the service locally in a docker container.
# Running these commands again will rebuild the container with any changes
# since the last time the commands were run.
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
  --env LOG_LEVEL="info" --env PORT="3000" --env DATABASE_URL="file:./db/dev.db" \
  --env WEBSITE_DOMAIN="http://localhost:3100" --env HOST="http://localhost:3000" \
  --env AUDIENCE="" --env ISSUER="" --env TOKEN_SIGNING_ALG="RS256" \
  server-manager-service
)
```

### Manual Testing

To make trying the service out easier the service provides a Swagger spec at /swagger. So, if you were running this locally for instance, you could browse to http://localhost:3000/swagger to see and interact with the APIs.
Additionally, there is a combined Swagger spec at swagger/combinedServerManagerService.yaml which can be used with many tools including to be imported in to Insomnia.
You can also test by running the [front-end project](https://github.com/Zane-T-Rice/apps) locally and pointing it at the locally running service.

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
npx ts-node prisma/scripts/listUsers.ts
```

There is a script to seed a development database with a couple Host and Server records.

```sh
# Seed development database.
npx ts-node prisma/scripts/seedServers.ts
```

If your local database becomes a mess you can wipe it out with this command.

```sh
npx prisma migrate reset
```

### Configuring Servers

Using the related [front-end project](https://github.com/Zane-T-Rice/apps) to setup servers takes most of the mystery out of it. However, one part that is not obvious is that you will need to make one of the Files a Dockerfile and of course add any Files that your Dockerfile needs as well. These are used to build the server during the `/start` and `/update` commands. The content field of a File is the base64 encoded string of the File.

### To Do

- Make network name configurable (and optional)
- Make restart policy configurable (and optional)
- Input validation in controllers.
- Probaby add integration tests. Right now it is all unit tests.
- Docker with non-root user (mostly so the files it generates are not owned by root).
- Delete server should stop/delete any related containers before removing the server record.
- Update/Restart should possibly lock the server record until they complete.
