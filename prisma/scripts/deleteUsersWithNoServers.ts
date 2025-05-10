import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config();

const prisma = new PrismaClient();

prisma.user
  .findMany({
    include: {
      servers: true,
    },
  })
  .then(async (users) => {
    const usersWithNoServers = users.filter(
      (user) => user.servers.length === 0
    );
    if (usersWithNoServers) {
      await Promise.all(
        usersWithNoServers.map(
          async (user) => await prisma.user.delete({ where: { id: user.id } })
        )
      );
    }
  })
  .catch((e) => {
    console.error(e);
  });
