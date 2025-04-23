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
import { formatMessage } from "../../src/utils";
jest.mock("@prisma/client");
jest.mock("../../src/utils/handleDatabaseErrors");
jest.mock("express-http-proxy");

describe("proxyMiddleware", () => {
  jest.clearAllMocks();

  let prisma = {
    server: {
      findUnique: jest.fn(),
    },
  };
  let next = jest.fn();
  const serverId = "serverid";

  beforeEach(() => {
    process.env.HOST = "host-url";
    prisma = {
      server: {
        findUnique: jest.fn(),
      },
    };
    next = jest.fn();
    (proxy as jest.Mock).mockImplementation(
      () => (req: Request, res: Response, next: NextFunction) => next()
    );
  });

  it("should call next if server does not exist", async () => {
    prisma.server.findUnique.mockResolvedValueOnce(null);
    await proxyMiddleware(prisma as unknown as PrismaClient)(
      { params: { id: serverId } } as unknown as Request,
      {} as Response,
      next
    );
    expect(prisma.server.findUnique).toHaveBeenCalledWith({
      where: { id: serverId },
      select: { host: { select: { url: true } } },
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should call next if server host url matches the host", async () => {
    prisma.server.findUnique.mockResolvedValueOnce({
      id: serverId,
      host: { url: process.env.HOST },
    });
    await proxyMiddleware(prisma as unknown as PrismaClient)(
      { params: { id: serverId } } as unknown as Request,
      {} as Response,
      next
    );
    expect(prisma.server.findUnique).toHaveBeenCalledWith({
      where: { id: serverId },
      select: { host: { select: { url: true } } },
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should throw BadRequestError if host is not set on the server", async () => {
    prisma.server.findUnique.mockResolvedValueOnce({
      id: serverId,
      host: null,
    });
    await expect(
      async () =>
        await proxyMiddleware(prisma as unknown as PrismaClient)(
          { params: { id: serverId } } as unknown as Request,
          {} as Response,
          next
        )
    ).rejects.toThrow(
      new BadRequestError(
        "The server with id serverid does not have a host configured."
      )
    );
    expect(prisma.server.findUnique).toHaveBeenCalledWith({
      where: { id: serverId },
      select: { host: { select: { url: true } } },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it(`should throw BadRequestError if host does not match and req.originalUrl starts with ${Routes.PROXY}`, async () => {
    const nonMatchingUrl = "url-does-not-match-host";
    prisma.server.findUnique.mockResolvedValueOnce({
      id: serverId,
      host: { url: nonMatchingUrl },
    });
    await expect(
      async () =>
        await proxyMiddleware(prisma as unknown as PrismaClient)(
          {
            params: { id: serverId },
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
    expect(prisma.server.findUnique).toHaveBeenCalledWith({
      where: { id: serverId },
      select: { host: { select: { url: true } } },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it(`should return response from proxy call if host does not match and req.originalUrl does not start with ${Routes.PROXY}`, async () => {
    const nonMatchingUrl = "http://localhost:3000";
    prisma.server.findUnique.mockResolvedValueOnce({
      id: serverId,
      host: { url: nonMatchingUrl },
    });
    await proxyMiddleware(prisma as unknown as PrismaClient)(
      {
        params: { id: serverId },
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
