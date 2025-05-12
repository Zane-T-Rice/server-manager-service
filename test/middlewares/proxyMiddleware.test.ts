import { PrismaClient } from "@prisma/client";
import {
  proxyErrorHandler,
  proxyMiddleware,
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

describe("proxyMiddleware", () => {
  jest.clearAllMocks();

  let prisma = {
    server: {
      findUniqueOrThrow: jest.fn(),
    },
  };
  let next = jest.fn();
  const hostId = "hostId";
  const serverId = "serverid";
  const username = "username";

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

  describe("admin:servers", () => {
    it("should call handleDatabaseErrors if server does not exist", async () => {
      prisma.server.findUniqueOrThrow.mockRejectedValueOnce(new Error());

      await expect(
        async () =>
          await proxyMiddleware(prisma as unknown as PrismaClient)(
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
      await proxyMiddleware(prisma as unknown as PrismaClient)(
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
          await proxyMiddleware(prisma as unknown as PrismaClient)(
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
      await proxyMiddleware(prisma as unknown as PrismaClient)(
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

  describe("user:servers", () => {
    it("should call handleDatabaseErrors if server does not exist", async () => {
      prisma.server.findUniqueOrThrow.mockRejectedValueOnce(new Error());

      await expect(
        async () =>
          await proxyMiddleware(prisma as unknown as PrismaClient)(
            {
              params: { serverId },
              auth: { payload: { sub: hostId } },
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
      await proxyMiddleware(prisma as unknown as PrismaClient)(
        {
          params: { serverId },
          auth: { payload: { sub: hostId } },
        } as unknown as Request,
        {} as Response,
        next
      );
      expect(prisma.server.findUniqueOrThrow).toHaveBeenCalledWith({
        where: {
          id: serverId,
          users: {
            some: {
              username,
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
          await proxyMiddleware(prisma as unknown as PrismaClient)(
            {
              params: { serverId },
              auth: { payload: { sub: hostId } },
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
              username,
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
      await proxyMiddleware(prisma as unknown as PrismaClient)(
        {
          params: { serverId },
          auth: { payload: { sub: hostId } },
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
