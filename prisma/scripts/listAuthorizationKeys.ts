import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config();

const prisma = new PrismaClient();

prisma.authorizationKey
  .findMany()
  .then((keys) => {
    console.log(keys);
  })
  .catch((e) => {
    console.error(e);
  });
