// Manually Add Hosts
import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { Host } from "prisma/prisma-client";
dotenv.config();

const prisma = new PrismaClient();
const host: Pick<Host, "url" | "name"> = {
  url: "",
  name: "",
};

const seed = async () => {
  return await prisma.host.create({
    data: host,
  });
};

seed();
