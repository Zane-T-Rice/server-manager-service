# server-manager-service

Provides server information and management functions such as restart.
The intent is not to call docker commands for information about the containers, but to have that information stored in this service by a user through REST APIs.
The interface with docker is exists, but theoretically it could be used with something other than docker with minimal code changes.

In other words, this service should exist independently of docker, but happens to be able to run docker commands with the data about the servers that it has stored.

### Requirements

```sh
node --version
v20.17.0

# Prisma is not a dependency in package.json
# Presumably you could add it and install it that way, but I do not have instructions for that.
prisma --version
prisma                  : 5.18.0
@prisma/client          : 5.21.1
Node.js                 : v20.17.0
Studio                  : 0.502.0

docker --version
Docker version 27.3.1, build v27.3.1

# If you want to make pull requests you will also need redocly
# Redocly is used to combine the Swagger spec in to a single file so that
# it can be easily imported or used by more tools, such as Insomnia.
redocly --version
1.25.9
```

#### If You Are On NixOS Then Put This In Your configuration.nix To Install Prisma

Installing the packages in home-manager also works great if you use that. However, I found that the environment variables did not work in home-manager, so maybe leave those in configuration.nix. This can also all be done using nix-env and/or nix-shell, of course.

```sh
  environment.systemPackages = with pkgs; [
    # For Prisma:
    nodePackages_latest.pnpm
    nodePackages_latest.vercel
    nodePackages_latest.prisma
    openssl
  ];

  environment.variables.PRISMA_QUERY_ENGINE_LIBRARY = "${pkgs.prisma-engines}/lib/libquery_engine.node";
  environment.variables.PRISMA_QUERY_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/query-engine";
  environment.variables.PRISMA_SCHEMA_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/schema-engine";

  virtualisation.docker.enable = true;

  # You need to add your user to the "docker" group and logout/login to get the new group.
  # This is just to show the scope where you add groups. You most likely have a user configuration
  # section already and should add it there.
  # users.users.YOUR_USERNAME = { extraGroups = [ "docker" ] }
```

### How to Get This Running

The service can be setup and started like this. Environment variables can also be placed in a file named .env in the root of the repository.

```sh
(
  export HOST=localhost
  export PORT=3000
  export DATABASE_URL=file:./db/dev.db
  npm install
  npx prisma migrate dev --name init
  npm run start
)
```

### Manual Testing

To make trying the service out easier the service provides a Swagger spec at /swagger. So, if you were running this locally for instance, you could browse to http://localhost:3000/swagger to see and interact with the APIs.
Additionally, there is a combined Swagger spec at swagger/combinedServerManagerService.yaml which can be used with many tools including to be imported in to Insomnia.

If your local database becomes a mess you can wipe it out with this command.

```sh
npx prisma migrate reset
```

### Docker

If you would like to run this in a docker container (I know I do), then feel free to use the example Dockerfile provided in docker/Dockerfile as a guide. You will, at the very least, need to update the `/path/to/` in the below command to be the real path to this repository.

The image can be built and started using these commands from within the directory with the Dockerfile. Note that the docker.sock is mounted because this service exists to provide the ability to manage your docker containers.

```sh
  docker build -t server-manager-service --no-cache --build-arg ENV=local .

  docker run --name=server-manager-service -d \
  -p 3000:3000/udp \
  -p 3000:3000/tcp \
  -v /path/to/server-manager-service/prisma/db:/server-manager-service/prisma/db \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --restart unless-stopped server-manager-service
```

When running this service in docker the node_modules/, package-lock.json, .env, and generated files in prism/ will belong to root:root. If this is ever annoying you can change the owner by using this command or one like it.

```sh
sudo chown "$USER":users -R prisma node_modules package-lock.json .env
```

I've also noticed git-hooks can end up looking for the server-manager-service directory in /server-manager-service (which is where it will be in the container). You can make a symlink at /server-manager-service to fix it.

```sh
sudo ln -snf $PWD /server-manager-service
```

### Database

The database files will be created in server-manager-service/prisma/db.
If you want to keep the db folder safe outside of the repo, then move the db folder to the new location and make a symlink to the the db folder's new home.

```sh
mv /path/to/server-manager-server/prisma/db /new/path/to/db
ln -snf /new/path/to/db /path/to/server-manager-service/prisma/db
```

### To Do

- Input validation in controllers.
- Probaby add integration tests. Right now it is all unit tests.
- Creating a port for a non-existent server is 500 instead of 404.
