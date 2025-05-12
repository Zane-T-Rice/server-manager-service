import { PrismaClient, Server } from "@prisma/client";
import { handleDatabaseErrors } from "../../src/utils";
import { isServerMiddleware } from "../../src/middlewares";
import { Request, Response } from "express";
jest.mock("@prisma/client");
jest.mock("../../src/utils/handleDatabaseErrors");

describe("isServerMiddleware", () => {
  jest.clearAllMocks();

  let prisma = {
    server: {
      findUniqueOrThrow: jest.fn(),
    },
  };
  let next = jest.fn();
  const serverId = "serverid";
  const hostId = "hostId";
  const username = "username";

  beforeEach(() => {
    prisma = {
      server: {
        findUniqueOrThrow: jest.fn(),
      },
    };
    next = jest.fn();
  });

  describe("admin:servers", () => {
    it("should call next if server exists", async () => {
      prisma.server.findUniqueOrThrow.mockResolvedValueOnce(
        {} as unknown as Server
      );
      await isServerMiddleware(prisma as unknown as PrismaClient)(
        { params: { hostId, serverId } } as unknown as Request,
        {} as Response,
        next
      );
      expect(prisma.server.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: serverId, hostId },
      });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should call handleDatabaseErrors if server does not exist", async () => {
      prisma.server.findUniqueOrThrow.mockRejectedValueOnce(new Error());
      await isServerMiddleware(prisma as unknown as PrismaClient)(
        { params: { hostId, serverId } } as unknown as Request,
        {} as Response,
        next
      );
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [serverId]
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("user:servers", () => {
    it("should call next if server exists", async () => {
      prisma.server.findUniqueOrThrow.mockResolvedValueOnce(
        {} as unknown as Server
      );
      await isServerMiddleware(prisma as unknown as PrismaClient)(
        {
          params: { serverId },
          auth: { payload: { sub: username } },
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
      });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should call handleDatabaseErrors if server does not exist", async () => {
      prisma.server.findUniqueOrThrow.mockRejectedValueOnce(new Error());
      await isServerMiddleware(prisma as unknown as PrismaClient)(
        {
          params: { serverId },
          auth: { payload: { sub: username } },
        } as unknown as Request,
        {} as Response,
        next
      );
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [serverId]
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
