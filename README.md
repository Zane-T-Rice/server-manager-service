# server-manager-service

Provides server information and management functions such as stop, start, restart.

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
```

### How to Get This Running

The first time you start this you will need to copy .env.default over to .env.

```sh
cp .env.default .env
```

The service can be setup and started like this.

```sh
npm install
npx prisma migrate dev --name init
npm run start
```

### Manual Testing

To make trying the service out easier I have provided an insomnia.json. You can try the service out with the [Insomnia](https://insomnia.rest/) tool by importing the insomnia/insomnia.json file in to your insomnia scratchpad. There is no need to make an account to do this.

### Docker

If you would like to run this in a docker container (I know I do), then feel free to use the example Dockerfile provided in docker/Dockerfile as a guide. You will, at the very least, need to update the `/path/to/server-manager-service` in the below run command to be the real path to this repository.

The image can be built and started using these commands from within the directory with the Dockerfile. Note that the docker.sock is mounted because this service exists to provide the ability to manage your docker containers.

```sh
docker build -t server-manager-service --no-cache .
docker run --name=server-manager-service -d \
  -p 3000:3000/udp -p 3000:3000/tcp \
  -v /path/to/server-manager-service:/server-manager-service \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --restart unless-stopped server-manager-service
```
