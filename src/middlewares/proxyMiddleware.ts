import { NextFunction, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import proxy from "express-http-proxy";
import { ErrorMessages, Routes } from "../constants";
import { formatMessage } from "../utils";
import { BadRequestError } from "../errors/badRequestError";
import { InternalServerError } from "../errors";

// Proxy to the host of the server acted upon if it is different than the current host.
export function proxyMiddleware(prisma: PrismaClient) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const server = await prisma.server.findUnique({
      where: { id: id },
      select: { host: { select: { url: true } } },
    });

    // Do not proxy if the server does not exist. This error state is handled gracefully later.
    // Do not proxy if this is the matching host.
    if (!server || (server.host && server.host.url === process.env.HOST)) {
      next();
      return;
    }

    // Throw an error if the host is not set on the server.
    if (!server.host) {
      throw new BadRequestError(
        formatMessage(ErrorMessages.serverDoesNotHaveAHost, { serverId: id })
      );
    }

    // Throw an error if this was a Routes.PROXY request.
    // This, combined with adding Routes.PROXY when a proxy call is made,
    // prevents infinite proxy recursion.
    if (req.originalUrl.startsWith(Routes.PROXY)) {
      throw new BadRequestError(
        formatMessage(ErrorMessages.proxyHostMismatch, {
          serverId: id,
          serverHostUrl: server.host.url,
          hostUrl: process.env.HOST,
        })
      );
    }

    await proxy(server.host.url, {
      memoizeHost: false,
      proxyReqPathResolver: () => {
        // Add Routes.PROXY to indicate the request has been proxied to the correct host.
        // This, along with the check above, prevents infinite proxy recursion.
        return Routes.PROXY + req.originalUrl;
      },
      proxyErrorHandler: (err) => {
        if (err.code === "ECONNREFUSED") {
          next(
            new InternalServerError(
              formatMessage(ErrorMessages.hostDown, {
                serverId: id,
                serverHostUrl: server.host?.url,
              })
            )
          );
        } else next(err);
      },
    })(req, res, () => next("router"));
  };
}
