import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { scopeIncludesAny } from "express-oauth2-jwt-bearer";
import { Permissions } from "../constants";

/* Who may ask: anyone who may do at least a read, which is either permission. A login alone is not enough. */
export const canCheckHealth = scopeIncludesAny([
  Permissions.ADMIN,
  Permissions.USER,
]);

/* Answers 200 when the service can read its database and 503 when it cannot.
 * It is registered after the token check, like every other route, and reads nothing but a constant. */
export function healthCheck(prisma: Pick<PrismaClient, "$queryRaw">) {
  return async function (req: Request, res: Response) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  };
}
