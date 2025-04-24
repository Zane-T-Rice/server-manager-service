import { NextFunction, Request, Response } from "express";
import { handleDatabaseErrors } from "../utils";
import { PrismaClient } from "@prisma/client";

// Verify a Host exists for a given hostId or throw.
export function isHostMiddleware(prisma: PrismaClient) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const { hostId } = req.params;
    await prisma.host
      .findUniqueOrThrow({ where: { id: String(hostId) } })
      .then(() => next())
      .catch((e) => handleDatabaseErrors(e, "host", [String(hostId)]));
  };
}
