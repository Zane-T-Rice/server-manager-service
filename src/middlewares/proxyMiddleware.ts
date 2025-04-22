import { NextFunction, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import proxy from "express-http-proxy";

// Proxy to the host of the server acted upon if it is different than the current host.
export function proxyMiddleware(prisma: PrismaClient) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const server = await prisma.server.findUnique({ where: { id: id } });

    // Do not proxy if the server does not exist. (This error is uncovered and handled gracefully later.)
    // Do not proxy if this is the correct host.
    // Do not proxy if the original url does not start with /proxy. (Execution should not get to this code if this is true, but this is for safety.)
    if (
      !server ||
      (server.hostUrl && server.hostUrl === process.env.HOST) ||
      !req.originalUrl.startsWith("/proxy")
    ) {
      req.log.trace("proxyMiddleware: SKIPPING PROXYING");
      next();
      return;
    }

    req.log.trace("proxyMiddleware: PROXYING");

    // Set didProxy so that future routes know not to handle this request.
    res.locals.didProxy = true;

    await proxy(server.hostUrl, {
      memoizeHost: false,
      proxyReqPathResolver: function () {
        // 6 is the length of '/proxy'. Removing /proxy prevents infinite proxy recursion.
        return req.originalUrl.substring(6);
      },
    })(req, res, next);
  };
}
