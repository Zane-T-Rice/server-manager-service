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
  serverHostUrl: string | undefined,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (err: any) {
    if (err.code === "ECONNREFUSED") {
      next(
        new InternalServerError(
          formatMessage(ErrorMessages.hostDown, {
            serverId,
            serverHostUrl,
          }),
        ),
      );
    } else next(err);
  };
}

// Proxy to the host at hostUrl if it is different than the current host.
// mismatchMessage is the error when a request that was already proxied turns out to be for another host.
async function proxyToOtherHost(
  req: Request,
  res: Response,
  next: NextFunction,
  hostUrl: string,
  mismatchMessage: string,
  proxyOptions: Pick<proxy.ProxyOptions, "timeout" | "proxyErrorHandler">,
) {
  // Do not proxy if this is the matching host.
  if (hostUrl === process.env.HOST) {
    next();
    return;
  }

  // Throw an error if this was a Routes.PROXY request.
  // This, combined with adding Routes.PROXY when a proxy call is made,
  // prevents infinite proxy recursion.
  if (req.originalUrl.startsWith(Routes.PROXY)) {
    throw new BadRequestError(mismatchMessage);
  }

  const url = new URL(hostUrl);
  await proxy(url.origin, {
    memoizeHost: false,
    proxyReqPathResolver: proxyReqPathResolver(url.pathname),
    ...proxyOptions,
  })(req, res, () => next("router"));
}

// Proxy to the host of the server acted upon if it is different than the current host.
export function serverProxyMiddleware(prisma: PrismaClient) {
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
                  userId: String(req.auth?.payload.sub),
                },
              },
            },
            select: { host: { select: { url: true } } },
          })
          .catch((e) => handleDatabaseErrors(e, "server", [serverId]));

    await proxyToOtherHost(
      req,
      res,
      next,
      server.host.url,
      formatMessage(ErrorMessages.serverProxyHostMismatch, {
        serverId,
        serverHostUrl: server.host.url,
        hostUrl: process.env.HOST,
      }),
      { proxyErrorHandler: proxyErrorHandler(next, serverId, server.host.url) },
    );
  };
}

// Proxy to the host if it is different than the current host.
// Used by routes that need to ask the host itself (i.e. for the status of its containers).
export function hostProxyMiddleware(prisma: PrismaClient) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const { hostId } = req.params;
    const host = await prisma.host
      .findUniqueOrThrow({
        where: { id: String(hostId) },
        select: { url: true },
      })
      .catch((e) => handleDatabaseErrors(e, "host", [String(hostId)]));

    await proxyToOtherHost(
      req,
      res,
      next,
      host.url,
      formatMessage(ErrorMessages.hostProxyMismatch, {
        hostId,
        hostUrl: process.env.HOST,
        requestedHostUrl: host.url,
      }),
      {
        timeout: HOST_PROXY_TIMEOUT_MS,
        proxyErrorHandler: hostProxyErrorHandler(res, next),
      },
    );
  };
}

// Errors that mean the host could not be reached, rather than that it answered with an error.
const HOST_UNREACHABLE_CODES = [
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
];
// Do not wait forever on a host that does not answer (i.e. a LAN address from another network).
const HOST_PROXY_TIMEOUT_MS = 3000;

// If the host can not be reached, carry on with the request locally but flag it
// so the handler does not report this machine's containers as that host's.
export function hostProxyErrorHandler(res: Response, next: NextFunction) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (err: any) {
    if (HOST_UNREACHABLE_CODES.includes(err?.code)) {
      res.locals.hostUnreachable = true;
      next();
    } else next(err);
  };
}
