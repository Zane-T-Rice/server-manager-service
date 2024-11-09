import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config();

const prisma = new PrismaClient();

const authorizationKey: { owner: string; value: string } = {
  owner: "",
  value: "",
};

if (!authorizationKey.owner || !authorizationKey.value)
  throw new Error("Please set the owner and value of the authorization key.");

prisma.authorizationKey
  .create({
    data: {
      owner: String(authorizationKey.owner),
      value: String(authorizationKey.value),
    },
  })
  .then(() => {
    console.log("Authorization key created.");
  })
  .catch((e) => {
    console.error(e);
  });
