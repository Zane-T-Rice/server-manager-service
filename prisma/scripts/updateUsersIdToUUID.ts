// Only useful for a one-time data migration, but doing this in the normal
// migration flow ain't happening and the ids not being uuids for a bit
// won't harm anything.
import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
dotenv.config();

const prisma = new PrismaClient();

async function updateUserIdToUUID() {
  const users = await prisma.user.findMany();

  await Promise.all(
    users.map(async (user) => {
      await prisma.user.update({
        where: { id: user.id },
        data: { id: randomUUID() },
      });
    })
  );
}

updateUserIdToUUID();
