import { NextFunction, Request, Response } from "express";
import { formatMessage, handleDatabaseErrors, isNil } from "../utils";
import { PrismaClient } from "@prisma/client";
import { BadRequestError } from "../errors";
import { ErrorMessages } from "../constants";

// Verify a Host exists for a given hostId or throw.
export function isHostMiddleware(prisma: PrismaClient, required: boolean) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const { hostId: hostIdBody } = req.body;
    const { hostId: hostIdParams } = req.params;
    const hostId = hostIdParams || hostIdBody;

    if (!isNil(hostId))
      await prisma.host
        .findUniqueOrThrow({ where: { id: String(hostId) } })
        .then(() => next())
        .catch((e) => handleDatabaseErrors(e, "host", [String(hostId)]));
    else if (required)
      throw new BadRequestError(
        formatMessage(ErrorMessages.theArgumentIsRequired, {
          argument: `hostId`,
        })
      );
    else next();
  };
}
