import { NextFunction, Request, Response } from "express";
import { handleDatabaseErrors, isNil } from "../utils";
import { PrismaClient } from "@prisma/client";

// Verify a Host exists for a given hostId or throw.
export function isHostMiddleware(prisma: PrismaClient) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const { hostId } = req.body;

    if (!isNil(hostId))
      await prisma.host
        .findUniqueOrThrow({ where: { id: hostId } })
        .then(() => next())
        .catch((e) => handleDatabaseErrors(e, "host", [hostId]));
    else next();
  };
}
