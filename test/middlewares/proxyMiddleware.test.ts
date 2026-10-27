import { PrismaClient } from "@prisma/client";
import {
  hostProxyErrorHandler,
  hostProxyMiddleware,
  proxyErrorHandler,
  serverProxyMiddleware,
  proxyReqPathResolver,
} from "../../src/middlewares";
import { NextFunction, Request, Response } from "express";
import proxy from "express-http-proxy";
import { BadRequestError, InternalServerError } from "../../src/errors";
import { ErrorMessages, Routes } from "../../src/constants";
import { formatMessage, handleDatabaseErrors } from "../../src/utils";
jest.mock("@prisma/client");
jest.mock("express-http-proxy");
jest.mock("../../src/utils/handleDatabaseErrors");

describe("serverProxyMiddleware", () => {
  jest.clearAllMocks();

  let prisma = {
    server: {
      findUniqueOrThrow: jest.fn(),
    },
  };
  let next = jest.fn();
  const hostId = "hostId";
  const serverId = "serverid";
  const userId = "userId";

  beforeEach(() => {
    process.env.HOST = "host-url";
    prisma = {
      server: {
        findUniqueOrThrow: jest.fn(),
      },
    };
    next = jest.fn();
    (proxy as jest.Mock).mockImplementation(
      () => (req: Request, res: Response, next: NextFunction) => next()
    );
    (handleDatabaseErrors as unknown as jest.Mock).mockRejectedValue(
      new Error()
    );
  });

  describe("server-manager:admin", () => {
    it("should call handleDatabaseErrors if server does not exist", async () => {
      prisma.server.findUniqueOrThrow.mockRejectedValueOnce(new Error());

      await expect(
        async () =>
          await serverProxyMiddleware(prisma as unknown as PrismaClient)(
            { params: { hostId, serverId } } as unknown as Request,
            {} as Response,
            next
          )
      ).rejects.toThrow();
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [serverId]
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next if server host url matches the host", async () => {
      prisma.server.findUniqueOrThrow.mockResolvedValueOnce({
        id: serverId,
        host: { url: process.env.HOST },
      });
      await serverProxyMiddleware(prisma as unknown as PrismaClient)(
        { params: { hostId, serverId } } as unknown as Request,
        {} as Response,
        next
      );
      expect(prisma.server.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: serverId, hostId },
        select: { host: { select: { url: true } } },
      });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it(`should throw BadRequestError if host does not match and req.originalUrl starts with ${Routes.PROXY}`, async () => {
      const nonMatchingUrl = "url-does-not-match-host";
      prisma.server.findUniqueOrThrow.mockResolvedValueOnce({
        id: serverId,
        host: { url: nonMatchingUrl },
      });
      await expect(
        async () =>
          await serverProxyMiddleware(prisma as unknown as PrismaClient)(
            {
              params: { hostId, serverId },
              originalUrl: Routes.PROXY + `/server/${serverId}/update`,
            } as unknown as Request,
            {} as Response,
            next
          )
      ).rejects.toThrow(
        new BadRequestError(
          `The host for server with id ${serverId} is ${nonMatchingUrl} which resolves to a real host, but does not exactly match the existing host's url ${process.env.HOST}.`
        )
      );
      expect(prisma.server.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: serverId, hostId },
        select: { host: { select: { url: true } } },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it(`should return response from proxy call if host does not match and req.originalUrl does not start with ${Routes.PROXY}`, async () => {
      const nonMatchingUrl = "http://localhost:3000";
      prisma.server.findUniqueOrThrow.mockResolvedValueOnce({
        id: serverId,
        host: { url: nonMatchingUrl },
      });
      await serverProxyMiddleware(prisma as unknown as PrismaClient)(
        {
          params: { hostId, serverId },
          originalUrl: `/server/${serverId}/update`,
        } as unknown as Request,
        {} as Response,
        next
      );
      expect(proxy as jest.Mock).toHaveBeenCalledWith(nonMatchingUrl, {
        memoizeHost: false,
        proxyReqPathResolver: expect.any(Function),
        proxyErrorHandler: expect.any(Function),
      });
      expect(next).toHaveBeenCalledWith("router");
    });
  });

  describe("server-manager:public", () => {
    it("should call handleDatabaseErrors if server does not exist", async () => {
      prisma.server.findUniqueOrThrow.mockRejectedValueOnce(new Error());

      await expect(
        async () =>
          await serverProxyMiddleware(prisma as unknown as PrismaClient)(
            {
              params: { serverId },
              auth: { payload: { sub: userId } },
            } as unknown as Request,
            {} as Response,
            next
          )
      ).rejects.toThrow();
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [serverId]
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should call next if server host url matches the host", async () => {
      prisma.server.findUniqueOrThrow.mockResolvedValueOnce({
        id: serverId,
        host: { url: process.env.HOST },
      });
      await serverProxyMiddleware(prisma as unknown as PrismaClient)(
        {
          params: { serverId },
          auth: { payload: { sub: userId } },
        } as unknown as Request,
        {} as Response,
        next
      );
      expect(prisma.server.findUniqueOrThrow).toHaveBeenCalledWith({
        where: {
          id: serverId,
          users: {
            some: {
              userId,
            },
          },
        },
        select: { host: { select: { url: true } } },
      });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it(`should throw BadRequestError if host does not match and req.originalUrl starts with ${Routes.PROXY}`, async () => {
      const nonMatchingUrl = "url-does-not-match-host";
      prisma.server.findUniqueOrThrow.mockResolvedValueOnce({
        id: serverId,
        host: { url: nonMatchingUrl },
      });
      await expect(
        async () =>
          await serverProxyMiddleware(prisma as unknown as PrismaClient)(
            {
              params: { serverId },
              auth: { payload: { sub: userId } },
              originalUrl: Routes.PROXY + `/server/${serverId}/update`,
            } as unknown as Request,
            {} as Response,
            next
          )
      ).rejects.toThrow(
        new BadRequestError(
          `The host for server with id ${serverId} is ${nonMatchingUrl} which resolves to a real host, but does not exactly match the existing host's url ${process.env.HOST}.`
        )
      );
      expect(prisma.server.findUniqueOrThrow).toHaveBeenCalledWith({
        where: {
          id: serverId,
          users: {
            some: {
              userId,
            },
          },
        },
        select: { host: { select: { url: true } } },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it(`should return response from proxy call if host does not match and req.originalUrl does not start with ${Routes.PROXY}`, async () => {
      const nonMatchingUrl = "http://localhost:3000";
      prisma.server.findUniqueOrThrow.mockResolvedValueOnce({
        id: serverId,
        host: { url: nonMatchingUrl },
      });
      await serverProxyMiddleware(prisma as unknown as PrismaClient)(
        {
          params: { serverId },
          auth: { payload: { sub: userId } },
          originalUrl: `/server/${serverId}/update`,
        } as unknown as Request,
        {} as Response,
        next
      );
      expect(proxy as jest.Mock).toHaveBeenCalledWith(nonMatchingUrl, {
        memoizeHost: false,
        proxyReqPathResolver: expect.any(Function),
        proxyErrorHandler: expect.any(Function),
      });
      expect(next).toHaveBeenCalledWith("router");
    });
  });

  describe("proxyReqPathResolver", () => {
    it(`should prepend originalUrl with ${Routes.PROXY}`, () => {
      const hostPath = "/host-path";
      const originalUrl = `/server/${serverId}/update`;
      const newUrl = proxyReqPathResolver(hostPath)({
        originalUrl,
      } as unknown as Request);
      expect(newUrl).toEqual(hostPath + Routes.PROXY + originalUrl);
    });
  });

  describe("proxyErrorHandler", () => {
    it(`should call next with new BadRequestError if the error code is ECONNREFUSED`, () => {
      const error = {
        message: "error",
        name: "ECONNREFUSED",
        code: "ECONNREFUSED",
      } as Error;
      proxyErrorHandler(next, serverId, process.env.HOST)(error);
      expect(next).toHaveBeenCalledWith(
        new InternalServerError(
          formatMessage(ErrorMessages.hostDown, {
            serverId,
            serverHostUrl: process.env.HOST,
          })
        )
      );
    });

    it(`should call next with original error if the error code is not ECONNREFUSED`, () => {
      const error = {
        message: "error",
        name: "NOT_ECONNREFUSED",
        code: "NOT_ECONNREFUSED",
      } as Error;
      proxyErrorHandler(next, serverId, process.env.HOST)(error);
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

describe("hostProxyMiddleware", () => {
  const hostId = "hostId";
  let prisma = { host: { findUniqueOrThrow: jest.fn() } };
  let next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOST = "host-url";
    prisma = { host: { findUniqueOrThrow: jest.fn() } };
    next = jest.fn();
    (proxy as jest.Mock).mockImplementation(
      () => (req: Request, res: Response, next: NextFunction) => next()
    );
    (handleDatabaseErrors as unknown as jest.Mock).mockRejectedValue(
      new Error()
    );
  });

  it("should call handleDatabaseErrors if host does not exist", async () => {
    prisma.host.findUniqueOrThrow.mockRejectedValueOnce(new Error());
    await expect(
      async () =>
        await hostProxyMiddleware(prisma as unknown as PrismaClient)(
          { params: { hostId } } as unknown as Request,
          {} as Response,
          next
        )
    ).rejects.toThrow();
    expect(handleDatabaseErrors).toHaveBeenCalledWith(
      expect.any(Error),
      "host",
      [hostId]
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next if host url matches the host", async () => {
    prisma.host.findUniqueOrThrow.mockResolvedValueOnce({
      url: process.env.HOST,
    });
    await hostProxyMiddleware(prisma as unknown as PrismaClient)(
      { params: { hostId } } as unknown as Request,
      {} as Response,
      next
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(proxy as jest.Mock).not.toHaveBeenCalled();
  });

  it(`should throw BadRequestError if host does not match and req.originalUrl starts with ${Routes.PROXY}`, async () => {
    prisma.host.findUniqueOrThrow.mockResolvedValueOnce({ url: "other-url" });
    await expect(
      async () =>
        await hostProxyMiddleware(prisma as unknown as PrismaClient)(
          {
            params: { hostId },
            originalUrl: `${Routes.PROXY}/hosts/${hostId}/servers`,
          } as unknown as Request,
          {} as Response,
          next
        )
    ).rejects.toThrow(BadRequestError);
    expect(next).not.toHaveBeenCalled();
  });

  it("should proxy if host does not match and req.originalUrl does not start with the proxy route", async () => {
    prisma.host.findUniqueOrThrow.mockResolvedValueOnce({
      url: "http://localhost:3000",
    });
    await hostProxyMiddleware(prisma as unknown as PrismaClient)(
      {
        params: { hostId },
        originalUrl: `/hosts/${hostId}/servers`,
      } as unknown as Request,
      {} as Response,
      next
    );
    expect(proxy as jest.Mock).toHaveBeenCalledWith("http://localhost:3000", {
      memoizeHost: false,
      proxyReqPathResolver: expect.any(Function),
      timeout: expect.any(Number),
      proxyErrorHandler: expect.any(Function),
    });
    expect(next).toHaveBeenCalledWith("router");
  });

  describe("hostProxyErrorHandler", () => {
    it.each(["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EHOSTUNREACH"])(
      "should carry on locally, flagged as unreachable, on %s",
      (code) => {
        const res = { locals: {} } as unknown as Response;
        hostProxyErrorHandler(res, next)({ code });
        expect(res.locals.hostUnreachable).toBe(true);
        expect(next).toHaveBeenCalledWith();
      }
    );
    it("should pass any other error on to next", () => {
      const res = { locals: {} } as unknown as Response;
      const err = new Error();
      hostProxyErrorHandler(res, next)(err);
      expect(res.locals.hostUnreachable).toBeUndefined();
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
