import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config();

const serverId = "";
const newHostId = "";

const prisma = new PrismaClient();

async function updateHostOfServer() {
  // Make sure server exists.
  const server = await prisma.server.findUniqueOrThrow({
    where: { id: String(serverId) },
  });

  // Make sure the new host exists.
  const newHost = await prisma.host.findUniqueOrThrow({
    where: { id: String(newHostId) },
  });

  // Switch the server's host.
  await prisma.server.update({
    where: { id: String(server.id) },
    data: {
      hostId: String(newHost.id),
    },
  });
}

updateHostOfServer();
