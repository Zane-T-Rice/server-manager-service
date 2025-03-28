import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config();

const prisma = new PrismaClient();

prisma.server
  .findMany()
  .then((servers) => {
    console.log(servers);
  })
  .catch((e) => {
    console.error(e);
  });
