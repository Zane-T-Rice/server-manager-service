// Creates the Host and the Server record that describe this service itself, so the service can run as a server
// and update itself. This is the one record that has to exist before the service does. See deploy/README.md.
//
//   DATABASE_URL=file:/srv/servers/db/dev.db npx ts-node --files prisma/scripts/createSelfServer.ts \
//     <node name> <directory on that node that holds the database> <env file>
//
// The env file lists the service's own environment variables (see the README) in .env format, as they should be
// inside the pod, e.g. DATABASE_URL=file:./db/dev.db. SELF_SERVER_ID is added for you.
// Prints the id of the new server. Run `npx prisma migrate deploy` against the same DATABASE_URL first.
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
dotenv.config();

const DB_MOUNT = "/server-manager-service/prisma/db";
const PORT = 3000;

const [nodeName, dbDirectory, envFile] = process.argv.slice(2);
if (!nodeName || !dbDirectory || !envFile) {
  console.error(
    "Usage: createSelfServer.ts <node name> <database directory on that node> <env file>",
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const readFile = (name: string) =>
  fs
    .readFileSync(path.join(__dirname, "../../docker/deployment", name))
    .toString("base64");

const create = async () => {
  const env = dotenv.parse(fs.readFileSync(envFile));
  const host =
    (await prisma.host.findFirst({ where: { name: nodeName } })) ??
    (await prisma.host.create({ data: { name: nodeName } }));

  const server = await prisma.server.create({
    data: {
      applicationName: "server-manager-service",
      containerName: "server-manager-service",
      isInResponseChain: false,
      isUpdatable: true,
      hostId: host.id,
      ports: { create: [{ number: PORT, protocol: "tcp" }] },
      volumes: {
        create: [{ hostPath: dbDirectory, containerPath: DB_MOUNT }],
      },
      files: {
        create: ["Dockerfile", "start-server-manager-service-server.sh"].map(
          (name) => ({ name, content: readFile(name) }),
        ),
      },
    },
  });

  await prisma.environmentVariable.createMany({
    data: Object.entries({ ...env, SELF_SERVER_ID: server.id }).map(
      ([name, value]) => ({ serverId: server.id, name, value }),
    ),
  });
  console.log(server.id);
};

create().finally(() => prisma.$disconnect());
