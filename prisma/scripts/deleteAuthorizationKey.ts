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
  .delete({
    where: {
      owner_value: {
        owner: String(authorizationKey.owner),
        value: String(authorizationKey.value),
      },
    },
  })
  .then(() => {
    console.log("Authorization key deleted.");
  })
  .catch((e) => {
    console.error(e);
  });
