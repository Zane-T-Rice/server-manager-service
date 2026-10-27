import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

/* Answers 200 when the service can read its database and 503 when it cannot.
 * It is open to everyone (it is registered before the token check) so the apps site can show
 * whether this service is up without a login. */
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
