// Manually Add Hosts
import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { Host } from "prisma/prisma-client";
dotenv.config();

const prisma = new PrismaClient();
const host: Pick<Host, "id"> = {
  id: "",
};

const seed = async () => {
  return await prisma.host.delete({ where: { id: host.id } });
};

seed();
