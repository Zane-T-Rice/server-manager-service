import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config();

const prisma = new PrismaClient();

prisma.user
  .findMany({
    include: {
      servers: true
    }
  })
  .then((users) => {
    users.map(user => {
      console.groupEnd();
      console.group(user.id);
      user.servers.map(server => {
        console.log({
          serverId: server.id,
          hostId: server.hostId,
          containerName: server.containerName,
          applicationName: server.applicationName
        })
      })
    })
  })
  .catch((e) => {
    console.error(e);
  });
