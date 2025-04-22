import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config();

const prisma = new PrismaClient();

prisma.host
  .findMany()
  .then((host) => {
    console.log(host);
  })
  .catch((e) => {
    console.error(e);
  });
