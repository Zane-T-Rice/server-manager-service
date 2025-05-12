import { NextFunction, Request, Response } from "express";
import { handleDatabaseErrors } from "../utils";
import { PrismaClient } from "@prisma/client";

// Verify a server exists for a given id or throw.
export function isServerMiddleware(prisma: PrismaClient) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const { hostId, serverId } = req.params;
    if (hostId)
      await prisma.server
        .findUniqueOrThrow({
          where: {
            id: String(serverId),
            hostId: String(hostId),
          },
        })
        .then(() => next())
        .catch((e) => handleDatabaseErrors(e, "server", [serverId]));
    else
      await prisma.server
        .findUniqueOrThrow({
          where: {
            id: String(serverId),
            users: {
              some: {
                username: String(req.auth?.payload.sub),
              },
            },
          },
        })
        .then(() => next())
        .catch((e) => handleDatabaseErrors(e, "server", [serverId]));
  };
}
