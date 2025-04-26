import { UserServerLinksService } from "../../src/services";
import { PrismaClient, Server } from "@prisma/client";
import { Request, Response } from "express";
import { handleDatabaseErrors } from "../../src/utils";
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      return {
        server: {
          create: jest.fn(),
          findMany: jest.fn(),
          findUniqueOrThrow: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        user: {
          update: jest.fn(),
          upsert: jest.fn(),
        },
      };
    }),
  };
});
jest.mock("../../src/utils/handleDatabaseErrors", () => {
  return {
    handleDatabaseErrors: jest.fn().mockRejectedValue(new Error()),
  };
});

console.log("BRUH");
describe("UserServerLinksService", () => {
  const hostId = "hostId";
  const serverId = "serverId";
  const userId = "userId";
  const req: Request = {
    params: {
      hostId,
      serverId,
      userId,
    },
  } as unknown as Request;
  const res: Response = { json: jest.fn() } as unknown as Response;
  console.log("BRUH 1");
  new UserServerLinksService();
  console.log("BRUH 2");
  beforeEach(() => {
    jest.clearAllMocks();

    console.log("BRUH 3");
    // None of these return values are check. The queries are run and throw an
    // error if something is wrong.
    jest
      .spyOn(UserServerLinksService.instance.prisma.server, "findUniqueOrThrow")
      .mockResolvedValue({ id: serverId } as Server);
    console.log("BRUH 6");
    jest
      .spyOn(UserServerLinksService.instance.prisma.user, "upsert")
      .mockResolvedValue({ id: userId });
    console.log("BRUH 7");
    jest
      .spyOn(UserServerLinksService.instance.prisma.user, "update")
      .mockResolvedValue({ id: userId });
    console.log("BRUH 8");
  });

  console.log("BRUH 4");
  it("should use passed in prisma client if no prisma client is set", () => {
    console.log("BRUH 5");
    // @ts-expect-error to make testing easier
    UserServerLinksService.instance.prisma = undefined;
    const prisma = new PrismaClient();
    const serversService2 = new UserServerLinksService(prisma);
    expect(serversService2.prisma).toEqual(prisma);
  });

  it("should use existing prisma client even if another is passed in", () => {
    const currentPrisma = UserServerLinksService.instance.prisma;
    const prisma = new PrismaClient();
    const serversService2 = new UserServerLinksService(prisma);
    expect(serversService2.prisma).toEqual(currentPrisma);
  });

  describe("patchUserServerLinkByUserId", () => {
    it("should connect the user and server", async () => {
      await UserServerLinksService.instance.patchUserServerLinkByUserId(
        req,
        res
      );
      expect(
        UserServerLinksService.instance.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: String(serverId),
          hostId: String(hostId),
        },
        select: UserServerLinksService.defaultUserServerLinkSelect,
      });
      expect(
        UserServerLinksService.instance.prisma.user.upsert
      ).toHaveBeenCalledWith({
        where: { id: String(userId) },
        create: {
          id: String(userId),
          servers: {
            connect: {
              id: String(serverId),
            },
          },
        },
        update: {
          servers: {
            connect: {
              id: String(serverId),
            },
          },
        },
      });
      expect(res.json).toHaveBeenCalledWith({ userId, serverId });
    });
    it("should handle errors when trying to connect the user and server", async () => {
      expect.assertions(4);
      (
        UserServerLinksService.instance.prisma.server
          .findUniqueOrThrow as unknown as jest.Mock
      ).mockRejectedValue(new Error());
      try {
        await UserServerLinksService.instance.patchUserServerLinkByUserId(
          req,
          res
        );
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        UserServerLinksService.instance.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: String(serverId),
          hostId: String(hostId),
        },
        select: UserServerLinksService.defaultUserServerLinkSelect,
      });
      expect(
        UserServerLinksService.instance.prisma.user.upsert
      ).not.toHaveBeenCalled();
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [serverId]
      );
    });
  });

  describe("deleteUserServerLinkByUserId", () => {
    it("should connect the user and server", async () => {
      await UserServerLinksService.instance.deleteUserServerLinkByUserId(
        req,
        res
      );
      expect(
        UserServerLinksService.instance.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: String(serverId),
          hostId: String(hostId),
        },
        select: UserServerLinksService.defaultUserServerLinkSelect,
      });
      expect(
        UserServerLinksService.instance.prisma.user.update
      ).toHaveBeenCalledWith({
        where: { id: String(userId) },
        data: {
          servers: {
            disconnect: {
              id: String(serverId),
            },
          },
        },
      });
      expect(res.json).toHaveBeenCalledWith({ userId, serverId });
    });
    it("should handle errors when trying to connect the user and server", async () => {
      expect.assertions(4);
      (
        UserServerLinksService.instance.prisma.server
          .findUniqueOrThrow as unknown as jest.Mock
      ).mockRejectedValue(new Error());
      try {
        await UserServerLinksService.instance.deleteUserServerLinkByUserId(
          req,
          res
        );
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        UserServerLinksService.instance.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: String(serverId),
          hostId: String(hostId),
        },
        select: UserServerLinksService.defaultUserServerLinkSelect,
      });
      expect(
        UserServerLinksService.instance.prisma.user.update
      ).not.toHaveBeenCalled();
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [serverId]
      );
    });
    it("should handle errors when trying to connect the user and server", async () => {
      expect.assertions(4);
      (
        UserServerLinksService.instance.prisma.user
          .update as unknown as jest.Mock
      ).mockRejectedValue(new Error());
      try {
        await UserServerLinksService.instance.deleteUserServerLinkByUserId(
          req,
          res
        );
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        UserServerLinksService.instance.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: String(serverId),
          hostId: String(hostId),
        },
        select: UserServerLinksService.defaultUserServerLinkSelect,
      });
      expect(
        UserServerLinksService.instance.prisma.user.update
      ).toHaveBeenCalledWith({
        data: { servers: { disconnect: { id: "serverId" } } },
        where: { id: "userId" },
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "user",
        [userId]
      );
    });
  });
});
