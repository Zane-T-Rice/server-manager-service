import { ServersService, UserServersService } from "../../src/services";
import { PrismaClient, Server, User } from "@prisma/client";
import { Request, Response } from "express";
import { handleDatabaseErrors } from "../../src/utils";
import { BadRequestError } from "../../src/errors";
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

describe("UserServersService", () => {
  const hostId = "hostId";
  const username = "username";
  const body = {
    applicationName: "appName",
    containerName: "containerName",
    isInResponseChain: false,
    isUpdatable: false,
    hostId,
  };
  const mockServerRecord = {
    id: "serverid",
    ...body,
  } as Server;
  const mockUserRecord = {
    id: "mockUserRecordId",
    username,
  } as User;
  const req: Request = {
    body,
    query: {},
    params: {
      serverId: mockServerRecord.id,
    },
    auth: { payload: { sub: username } },
  } as unknown as Request;
  const expReq: Request = {
    body,
    query: {},
    params: {
      serverId: mockServerRecord.id,
      hostId: mockServerRecord.hostId,
    },
    auth: { payload: { sub: username } },
  } as unknown as Request;
  const res: Response = { json: jest.fn() } as unknown as Response;
  new ServersService();
  new UserServersService();
  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .spyOn(UserServersService.instance.prisma.server, "findMany")
      .mockResolvedValue([mockServerRecord]);
    jest
      .spyOn(UserServersService.instance.prisma.server, "findUniqueOrThrow")
      .mockResolvedValue(mockServerRecord);
    jest
      .spyOn(UserServersService.instance.prisma.server, "delete")
      .mockResolvedValue(mockServerRecord);

    jest
      .spyOn(UserServersService.instance.prisma.user, "findMany")
      .mockResolvedValue([mockUserRecord]);

    jest.spyOn(ServersService.instance, "updateServer").mockResolvedValue();
    jest.spyOn(ServersService.instance, "stopServer").mockResolvedValue();
  });

  it("should use passed in prisma client if no prisma client is set", () => {
    // @ts-expect-error to make testing easier
    UserServersService.instance.prisma = undefined;
    const prisma = new PrismaClient();
    const serversService2 = new UserServersService(prisma);
    expect(serversService2.prisma).toEqual(prisma);
  });

  it("should use existing prisma client even if another is passed in", () => {
    const currentPrisma = UserServersService.instance.prisma;
    const prisma = new PrismaClient();
    const serversService2 = new UserServersService(prisma);
    expect(serversService2.prisma).toEqual(currentPrisma);
  });

  describe("POST /:id/stop", () => {
    it("Should stop server", async () => {
      await UserServersService.instance.stopServer(req, res);
      expect(
        UserServersService.instance.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecord.id,
          users: {
            some: {
              username,
            },
          },
        },
        select: { hostId: true },
      });
      expect(
        ServersService.instance.stopServer as unknown as jest.Mock
      ).toHaveBeenCalledWith(expReq, res);
    });
    it("should handle any database errors", async () => {
      expect.assertions(3);
      jest
        .spyOn(UserServersService.instance.prisma.server, "findUniqueOrThrow")
        .mockRejectedValue(new Error());
      try {
        await UserServersService.instance.stopServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        UserServersService.instance.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecord.id,
          users: {
            some: {
              username,
            },
          },
        },
        select: { hostId: true },
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id]
      );
    });
  });

  describe("POST /:id/update", () => {
    it("Should update server", async () => {
      await UserServersService.instance.updateServer(req, res);
      expect(
        UserServersService.instance.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecord.id,
          users: {
            some: {
              username,
            },
          },
        },
        select: { hostId: true },
      });
      expect(
        ServersService.instance.updateServer as unknown as jest.Mock
      ).toHaveBeenCalledWith(expReq, res);
    });
    it("should handle any database errors", async () => {
      expect.assertions(3);
      jest
        .spyOn(UserServersService.instance.prisma.server, "findUniqueOrThrow")
        .mockRejectedValue(new Error());
      try {
        await UserServersService.instance.updateServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        UserServersService.instance.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecord.id,
          users: {
            some: {
              username,
            },
          },
        },
        select: { hostId: true },
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id]
      );
    });
  });

  describe("GET /", () => {
    it("Should return list of servers", async () => {
      await UserServersService.instance.getServers(req, res);
      expect(
        UserServersService.instance.prisma.server.findMany
      ).toHaveBeenCalledWith({
        select: UserServersService.defaultServerSelect,
        where: {
          users: {
            some: {
              username: String(req.auth?.payload.sub),
            },
          },
        },
      });
      expect(res.json).toHaveBeenCalledWith([mockServerRecord]);
    });
    it("Should return list of servers that are updatable", async () => {
      const isUpdatableRequest: Request = {
        ...req,
        query: {
          isUpdatable: "true",
        },
      } as unknown as Request;
      await UserServersService.instance.getServers(isUpdatableRequest, res);
      expect(
        UserServersService.instance.prisma.server.findMany
      ).toHaveBeenCalledWith({
        select: UserServersService.defaultServerSelect,
        where: {
          isUpdatable: true,
          users: {
            some: {
              username: String(req.auth?.payload.sub),
            },
          },
        },
      });
      expect(res.json).toHaveBeenCalledWith([mockServerRecord]);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(UserServersService.instance.prisma.server, "findMany")
        .mockRejectedValue(new Error());
      try {
        await UserServersService.instance.getServers(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        UserServersService.instance.prisma.server.findMany
      ).toHaveBeenCalledWith({
        select: UserServersService.defaultServerSelect,
        where: {
          users: {
            some: {
              username: String(req.auth?.payload.sub),
            },
          },
        },
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("GET /:id", () => {
    it("Should return server", async () => {
      await UserServersService.instance.getServerById(req, res);
      expect(
        UserServersService.instance.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        select: UserServersService.defaultServerSelect,
        where: {
          id: mockServerRecord.id,
          users: {
            some: {
              username: String(req.auth?.payload.sub),
            },
          },
        },
      });
      expect(res.json).toHaveBeenCalledWith(mockServerRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(UserServersService.instance.prisma.server, "findUniqueOrThrow")
        .mockRejectedValue(new Error());
      try {
        await UserServersService.instance.getServerById(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        UserServersService.instance.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        select: UserServersService.defaultServerSelect,
        where: {
          id: mockServerRecord.id,
          users: {
            some: {
              username: String(req.auth?.payload.sub),
            },
          },
        },
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /:id", () => {
    it("Should delete server", async () => {
      await UserServersService.instance.deleteServer(req, res);
      expect(
        UserServersService.instance.prisma.user.findMany
      ).toHaveBeenCalledWith({
        where: {
          servers: {
            some: {
              id: mockServerRecord.id,
            },
          },
        },
      });
      expect(
        UserServersService.instance.prisma.server.delete
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecord.id,
          users: {
            every: {
              username: String(req.auth?.payload.sub),
            },
          },
        },
        select: UserServersService.defaultServerSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockServerRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(UserServersService.instance.prisma.server, "delete")
        .mockRejectedValue(new Error());
      try {
        await UserServersService.instance.deleteServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        UserServersService.instance.prisma.server.delete
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecord.id,
          users: {
            every: {
              username: String(req.auth?.payload.sub),
            },
          },
        },
        select: UserServersService.defaultServerSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
    it("should handle multiple users own the server throws BadRequestError", async () => {
      expect.assertions(4);
      jest
        .spyOn(UserServersService.instance.prisma.user, "findMany")
        .mockResolvedValue([mockUserRecord, mockUserRecord]);
      try {
        await UserServersService.instance.deleteServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestError);
      }
      expect(
        UserServersService.instance.prisma.server.findUniqueOrThrow
      ).not.toHaveBeenCalled();
      expect(handleDatabaseErrors).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("stringToBoolean", () => {
    it('should return true for "true"', () => {
      expect(new UserServersService().stringToBoolean("true")).toBe(true);
    });
    it('should return false for "false"', () => {
      expect(new UserServersService().stringToBoolean("false")).toBe(false);
    });
    it('should return undefined for "badbooleantext"', () => {
      expect(
        new UserServersService().stringToBoolean("badbooleantext")
      ).toBeUndefined();
    });
    it("should return undefined for undefined", () => {
      expect(
        new UserServersService().stringToBoolean(undefined)
      ).toBeUndefined();
    });
    it("should return undefined for null", () => {
      expect(new UserServersService().stringToBoolean(null)).toBeUndefined();
    });
  });
});
