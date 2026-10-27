# server-manager-service

Provides server information and management functions such as update.
The intent is to run servers on Kubernetes (k3s) based on information stored completely within the service.
The service has no access to the host: it only holds a namespaced Kubernetes service account, and the cluster
decides what is allowed. See [deploy/README.md](deploy/README.md) to set up the cluster and
[deploy/SETUP-COMMANDS.md](deploy/SETUP-COMMANDS.md) for what was done on the current machines.

### Requirements

```sh
# A k3s cluster is required to run servers. See deploy/README.md.
k3s --version

# The rest of these are only required to write code.
node --version
v22.14.0

# If you want to make pull requests you will also need redocly
# Redocly is used to combine the Swagger spec in to a single file so that
# it can be easily imported or used by more tools, such as Insomnia.
redocly --version
1.34.2

# Prisma is the database and you must use this version to be sure it will work.
prisma --version
prisma                  : 5.22.0
```

### Quick Notes

Many of the steps involve running npx to interact with prisma. On most distros this will probably work as written.
On NixOS, you will want to use the provided shell.nix to install the correct version of prisma and set some
environment variables. Alternatively, you can install prisma and set the environment variables in your .env file.
Make sure to use the same tarball as the shell.nix for the prisma package.

```sh
# On most distros
npx prisma studio

# On NixOS
nix-shell .
npx prisma studio

# Or on NixOS, set these in your .env file and install prisma version 5.22 in your nix configuration or home manager
PRISMA_QUERY_ENGINE_BINARY=/nix/store/ikd1v7jwcsr4nvxqmcxjqzqqk0s9xv6i-prisma-engines-5.22.0/bin/query-engine
PRISMA_QUERY_ENGINE_LIBRARY=/nix/store/ikd1v7jwcsr4nvxqmcxjqzqqk0s9xv6i-prisma-engines-5.22.0/lib/libquery_engine.node
PRISMA_SCHEMA_ENGINE_BINARY=/nix/store/ikd1v7jwcsr4nvxqmcxjqzqqk0s9xv6i-prisma-engines-5.22.0/bin/schema-engine

prismaPkg = import (builtins.fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/59133ee770406f605d61698bc4f1a89efcf461d5.tar.gz";
  }) {};

prismaPkg.prisma
```

The npx commands require the DATABASE_URL environment variable is set. You can either set it on the command line before each command `DATABASE_URL="file:./db/dev.db" npx prisma studio` or in a .env file.

### How To Get This Running (Deployment)

The service runs as a Pod on the cluster, started like any other server (see [deploy/README.md](deploy/README.md)).
Its environment variables are stored as Environment Variables on its own server record:

- ORCHESTRATOR=k8s is no longer needed; the service always uses Kubernetes.
- REGISTRY is the registry that build jobs push to and nodes pull from (e.g. `192.168.1.3:5000`). REGISTRY_INSECURE=true if it is plain http.
- SELF_SERVER_ID is the id of the service's own server record, so it can update itself with its own service account.
- WEBSITE_DOMAIN is needed if you want to use these APIs from client-side javascript in a browser.
- ISSUER is the domain that issues OAuth2.0 tokens. The service is configured for jwt bearer tokens made with the RS256 algorithm. AUDIENCE is the API Audience.
- AUTH0_MGMT_CLIENT_ID and AUTH0_MGMT_CLIENT_SECRET are for an Auth0 Machine-to-Machine application authorized for the Auth0 Management API with the `read:users` and `read:clients` scopes. They are used (along with ISSUER) to search for Auth0 users and to look up the email of a user when linking it to a server.
- The service uses the permissions "server-manager:admin" and "server-manager:public" to authorize users per route.

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

Run the service directly. Set the environment variables above in a .env file (plus DATABASE_URL, PORT and HOST),
point KUBECONFIG at a cluster set up as described in [deploy/README.md](deploy/README.md), and run:

```sh
npm run start:dev
```

The docker files in docker/development and docker/deployment build the same image that the build jobs produce for the
service's own server record. They need no docker socket and no docker CLI.

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
npx ts-node --files prisma/scripts/listUsers.ts
```

There is a script to seed a development database with a couple Host and Server records.

```sh
# Seed development database.
npx ts-node --files prisma/scripts/seedServers.ts
```

If your local database becomes a mess you can wipe it out with this command.

```sh
npx prisma migrate reset
```

### Configuring Servers

Using the related [front-end project](https://github.com/Zane-T-Rice/apps) to setup servers takes most of the mystery out of it. However, one part that is not obvious is that you will need to make one of the Files a Dockerfile and of course add any Files that your Dockerfile needs as well. These are used to build the server in a build job on the cluster during the `/update` command.

Things that differ from a plain `docker run`:

- Ports are published on the node the server runs on (`hostPort`), as `docker run -p` did.
- Volumes must be under one of the `allowedHostPaths` in [deploy/20-admission-policy.yaml](deploy/20-admission-policy.yaml), and privileged containers, host networking and added capabilities are refused by the cluster.
- Servers cannot reach each other unless a link is added to [deploy/35-server-links.yaml](deploy/35-server-links.yaml). A server is reached by its container name, as on the old docker network.
- The server runs on the node whose name equals its Host record's name. The content field of a File is the base64 encoded string of the File.

### To Do

- Input validation in controllers.
- Probaby add integration tests. Right now it is all unit tests.
- Delete server should stop/delete any related containers before removing the server record.
- Update should possibly lock the host record until it completes.
