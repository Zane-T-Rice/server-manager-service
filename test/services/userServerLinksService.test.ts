import { UserServerLinksService } from "../../src/services";
import { PrismaClient, Server, User } from "@prisma/client";
import { Request, Response } from "express";
import { handleDatabaseErrors } from "../../src/utils";
import {
  getAuth0ClientById,
  getAuth0UserById,
} from "../../src/utils/auth0ManagementClient";
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
          findMany: jest.fn(),
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

jest.mock("../../src/utils/auth0ManagementClient", () => {
  return {
    CLIENT_SUB_SUFFIX: "@clients",
    getAuth0ClientById: jest.fn(),
    getAuth0UserById: jest.fn(),
  };
});

describe("UserServerLinksService", () => {
  const hostId = "hostId";
  const serverId = "serverId";
  const deleteUserId = "userId";
  const userId = "auth0|userId";
  const email = "user@example.com";
  const mockUserRecord = {
    id: "mockUserRecordId",
    userId,
    email,
  } as User;
  const req: Request = {
    params: {
      hostId,
      serverId,
      userId: deleteUserId,
    },
  } as unknown as Request;
  const createRequest: Request = {
    params: {
      hostId,
      serverId,
    },
    body: { userId },
  } as unknown as Request;
  const emptyCreateRequest: Request = {
    params: {
      hostId,
      serverId,
    },
    body: {},
  } as unknown as Request;
  const res: Response = { json: jest.fn() } as unknown as Response;
  new UserServerLinksService();
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuth0UserById as jest.Mock).mockResolvedValue({
      user_id: userId,
      email,
    });

    // None of these return values are check. The queries are run and throw an
    // error if something is wrong.
    jest
      .spyOn(UserServerLinksService.instance.prisma.server, "findUniqueOrThrow")
      .mockResolvedValue({ id: serverId } as Server);
    jest
      .spyOn(UserServerLinksService.instance.prisma.user, "findMany")
      .mockResolvedValue([mockUserRecord]);
    jest
      .spyOn(UserServerLinksService.instance.prisma.user, "upsert")
      .mockResolvedValue(mockUserRecord);
    jest
      .spyOn(UserServerLinksService.instance.prisma.user, "update")
      .mockResolvedValue(mockUserRecord);
  });

  it("should use passed in prisma client if no prisma client is set", () => {
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

  describe("getUserServerLinks", () => {
    it("Should return list of userServerLinks", async () => {
      await UserServerLinksService.instance.getUserServerLinks(req, res);
      expect(
        UserServerLinksService.instance.prisma.user.findMany
      ).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([mockUserRecord]);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(UserServerLinksService.instance.prisma.user, "findMany")
        .mockRejectedValue(new Error());
      try {
        await UserServerLinksService.instance.getUserServerLinks(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        UserServerLinksService.instance.prisma.user.findMany
      ).toHaveBeenCalled();
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "userServerLink",
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      (
        UserServerLinksService.instance.prisma.server
          .findUniqueOrThrow as unknown as jest.Mock
      ).mockRejectedValue(new Error());
      try {
        await UserServerLinksService.instance.getUserServerLinks(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        UserServerLinksService.instance.prisma.user.findMany
      ).not.toHaveBeenCalled();
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [serverId]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("createUserServerLinkByUserId", () => {
    it("should connect the user and server", async () => {
      await UserServerLinksService.instance.createUserServerLinkByUserId(
        createRequest,
        res
      );
      expect(
        UserServerLinksService.instance.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: String(serverId),
          hostId: String(hostId),
        },
      });
      expect(
        UserServerLinksService.instance.prisma.user.upsert
      ).toHaveBeenCalledWith({
        where: { userId },
        select: UserServerLinksService.defaultUserServerLinkSelect,
        create: {
          userId,
          email,
          applicationName: null,
          servers: {
            connect: {
              id: String(serverId),
            },
          },
        },
        update: {
          email,
          applicationName: null,
          servers: {
            connect: {
              id: String(serverId),
            },
          },
        },
      });
      expect(getAuth0UserById).toHaveBeenCalledWith(userId);
      expect(res.json).toHaveBeenCalledWith(mockUserRecord);
    });
    it("should link a machine-to-machine application by its client sub", async () => {
      (getAuth0ClientById as jest.Mock).mockResolvedValue({
        client_id: "abc",
        name: "My Machine",
      });
      await UserServerLinksService.instance.createUserServerLinkByUserId(
        {
          params: { hostId, serverId },
          body: { userId: "abc@clients" },
        } as unknown as Request,
        res
      );
      expect(getAuth0ClientById).toHaveBeenCalledWith("abc");
      expect(getAuth0UserById).not.toHaveBeenCalled();
      expect(
        UserServerLinksService.instance.prisma.user.upsert
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "abc@clients" },
          create: expect.objectContaining({
            userId: "abc@clients",
            email: null,
            applicationName: "My Machine",
          }),
        })
      );
    });
    it("should reject a request without a userId", async () => {
      await expect(
        UserServerLinksService.instance.createUserServerLinkByUserId(
          emptyCreateRequest,
          res
        )
      ).rejects.toThrow("Argument `userId` is missing.");
      expect(getAuth0UserById).not.toHaveBeenCalled();
      expect(
        UserServerLinksService.instance.prisma.user.upsert
      ).not.toHaveBeenCalled();
    });
    it("should handle errors when trying to connect the user and server", async () => {
      expect.assertions(4);
      (
        UserServerLinksService.instance.prisma.server
          .findUniqueOrThrow as unknown as jest.Mock
      ).mockRejectedValue(new Error());
      try {
        await UserServerLinksService.instance.createUserServerLinkByUserId(
          createRequest,
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
    it("should handle errors when trying to connect the user and server", async () => {
      expect.assertions(4);
      (
        UserServerLinksService.instance.prisma.user
          .upsert as unknown as jest.Mock
      ).mockRejectedValue(new Error());
      try {
        await UserServerLinksService.instance.createUserServerLinkByUserId(
          createRequest,
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
      });
      expect(
        UserServerLinksService.instance.prisma.user.upsert
      ).toHaveBeenCalledWith({
        where: { userId },
        select: UserServerLinksService.defaultUserServerLinkSelect,
        create: {
          userId,
          email,
          applicationName: null,
          servers: {
            connect: {
              id: String(serverId),
            },
          },
        },
        update: {
          email,
          applicationName: null,
          servers: {
            connect: {
              id: String(serverId),
            },
          },
        },
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "userServerLink",
        [userId]
      );
    });
  });

  describe("deleteUserServerLinkByUserId", () => {
    it("should disconnect the user and server", async () => {
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
      });
      expect(
        UserServerLinksService.instance.prisma.user.update
      ).toHaveBeenCalledWith({
        where: { id: String(deleteUserId) },
        data: {
          servers: {
            disconnect: {
              id: String(serverId),
            },
          },
        },
      });
      expect(res.json).toHaveBeenCalledWith(mockUserRecord);
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
      });
      expect(
        UserServerLinksService.instance.prisma.user.update
      ).toHaveBeenCalledWith({
        data: { servers: { disconnect: { id: serverId } } },
        where: { id: deleteUserId },
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "userServerLink",
        [deleteUserId]
      );
    });
  });
});
