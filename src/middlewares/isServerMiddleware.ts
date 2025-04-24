import { NextFunction, Request, Response } from "express";
import { handleDatabaseErrors } from "../utils";
import { PrismaClient } from "@prisma/client";

// Verify a server exists for a given id or throw.
export function isServerMiddleware(prisma: PrismaClient) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const { hostId, serverId } = req.params;
    await prisma.server
      .findUniqueOrThrow({
        where: {
          id: String(serverId),
          hostId: hostId ? String(hostId) : undefined,
        },
      })
      .then(() => next())
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));
  };
}
