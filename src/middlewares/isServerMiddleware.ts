import { NextFunction, Request, Response } from "express";
import { handleDatabaseErrors } from "../utils";
import { PrismaClient } from "@prisma/client";

// Verify a server exists for a given id or throw.
export function isServerMiddleware(prisma: PrismaClient) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    await prisma.server
      .findUniqueOrThrow({
        where: {
          id: id,
        },
      })
      .then(() => {
        next();
      })
      .catch((e) => handleDatabaseErrors(e, "server", [id]));
  };
}
