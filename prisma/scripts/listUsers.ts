import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config();

const prisma = new PrismaClient();

prisma.user
  .findMany()
  .then((user) => {
    console.log(user);
  })
  .catch((e) => {
    console.error(e);
  });
