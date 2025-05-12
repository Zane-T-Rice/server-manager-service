import { NextFunction, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import proxy from "express-http-proxy";
import { ErrorMessages, Routes } from "../constants";
import { formatMessage, handleDatabaseErrors } from "../utils";
import { BadRequestError, InternalServerError } from "../errors";

export function proxyReqPathResolver(hostPath: string) {
  return function (req: Request) {
    // Add Routes.PROXY to indicate the request has been proxied to the correct host.
    // This, along with the check above, prevents infinite proxy recursion.
    return hostPath + Routes.PROXY + req.originalUrl;
  };
}

export function proxyErrorHandler(
  next: NextFunction,
  serverId: string,
  serverHostUrl: string | undefined
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (err: any) {
    if (err.code === "ECONNREFUSED") {
      next(
        new InternalServerError(
          formatMessage(ErrorMessages.hostDown, {
            serverId,
            serverHostUrl,
          })
        )
      );
    } else next(err);
  };
}

// Proxy to the host of the server acted upon if it is different than the current host.
export function proxyMiddleware(prisma: PrismaClient) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const { hostId, serverId } = req.params;
    const server = hostId
      ? await prisma.server
          .findUniqueOrThrow({
            where: {
              id: String(serverId),
              hostId: String(hostId),
            },
            select: { host: { select: { url: true } } },
          })
          .catch((e) => handleDatabaseErrors(e, "server", [serverId]))
      : await prisma.server
          .findUniqueOrThrow({
            where: {
              id: String(serverId),
              users: {
                some: {
                  username: String(req.auth?.payload.sub),
                },
              },
            },
            select: { host: { select: { url: true } } },
          })
          .catch((e) => handleDatabaseErrors(e, "server", [serverId]));

    // Do not proxy if this is the matching host.
    if (server.host.url === process.env.HOST) {
      next();
      return;
    }

    // Throw an error if this was a Routes.PROXY request.
    // This, combined with adding Routes.PROXY when a proxy call is made,
    // prevents infinite proxy recursion.
    if (req.originalUrl.startsWith(Routes.PROXY)) {
      throw new BadRequestError(
        formatMessage(ErrorMessages.proxyHostMismatch, {
          serverId,
          serverHostUrl: server.host.url,
          hostUrl: process.env.HOST,
        })
      );
    }

    const url = new URL(server.host.url);
    await proxy(url.origin, {
      memoizeHost: false,
      proxyReqPathResolver: proxyReqPathResolver(url.pathname),
      proxyErrorHandler: proxyErrorHandler(next, serverId, server.host.url),
    })(req, res, () => next("router"));
  };
}
