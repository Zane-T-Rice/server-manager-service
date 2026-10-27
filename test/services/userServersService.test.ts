import { ServersService, UserServersService } from "../../src/services";
import { PrismaClient, Server, User } from "@prisma/client";
import { Request, Response } from "express";
import { handleDatabaseErrors } from "../../src/utils";
import { BadRequestError } from "../../src/errors";
import { Routes } from "../../src/constants";
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
  const localHost = "http://localhost:3000";
  const remoteHost = "https://remote.example/2";
  const hostId = "hostId";
  const userId = "userId";
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
    userId,
  } as User;
  const req: Request = {
    body,
    query: {},
    params: {
      serverId: mockServerRecord.id,
    },
    auth: { payload: { sub: userId } },
  } as unknown as Request;
  const expReq: Request = {
    body,
    query: {},
    params: {
      serverId: mockServerRecord.id,
      hostId: mockServerRecord.hostId,
    },
    auth: { payload: { sub: userId } },
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
        UserServersService.instance.prisma.server.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecord.id,
          users: {
            some: {
              userId,
            },
          },
        },
        select: { hostId: true },
      });
      expect(
        ServersService.instance.stopServer as unknown as jest.Mock,
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
        UserServersService.instance.prisma.server.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecord.id,
          users: {
            some: {
              userId,
            },
          },
        },
        select: { hostId: true },
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id],
      );
    });
  });

  describe("POST /:id/update", () => {
    it("Should update server", async () => {
      await UserServersService.instance.updateServer(req, res);
      expect(
        UserServersService.instance.prisma.server.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecord.id,
          users: {
            some: {
              userId,
            },
          },
        },
        select: { hostId: true },
      });
      expect(
        ServersService.instance.updateServer as unknown as jest.Mock,
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
        UserServersService.instance.prisma.server.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecord.id,
          users: {
            some: {
              userId,
            },
          },
        },
        select: { hostId: true },
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id],
      );
    });
  });

  describe("GET /", () => {
    const serverWithHost = (host: string) => ({
      ...mockServerRecord,
      host: { url: host },
    });
    const mockContainers = (containers: Map<string, string> | undefined) =>
      jest
        .spyOn(ServersService.instance, "getContainerStatuses")
        .mockResolvedValue(containers);

    beforeEach(() => {
      process.env.HOST = localHost;
      mockContainers(new Map());
      jest
        .spyOn(UserServersService.instance.prisma.server, "findMany")
        .mockResolvedValue([serverWithHost(localHost)] as never);
    });

    it("Should return list of servers", async () => {
      await UserServersService.instance.getServers(req, res);
      expect(
        UserServersService.instance.prisma.server.findMany,
      ).toHaveBeenCalledWith({
        select: UserServersService.defaultServerSelect,
        where: {
          users: {
            some: {
              userId: String(req.auth?.payload.sub),
            },
          },
        },
      });
      expect(res.json).toHaveBeenCalledWith([
        { ...serverWithHost(localHost), status: "stopped" },
      ]);
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
        UserServersService.instance.prisma.server.findMany,
      ).toHaveBeenCalledWith({
        select: UserServersService.defaultServerSelect,
        where: {
          isUpdatable: true,
          users: {
            some: {
              userId: String(req.auth?.payload.sub),
            },
          },
        },
      });
      expect(res.json).toHaveBeenCalledWith([
        { ...serverWithHost(localHost), status: "stopped" },
      ]);
    });
    it("Should report the docker status of servers on this host", async () => {
      mockContainers(new Map([[mockServerRecord.containerName, "running"]]));
      await UserServersService.instance.getServers(req, res);
      expect(res.json).toHaveBeenCalledWith([
        { ...serverWithHost(localHost), status: "running" },
      ]);
    });
    it("Should report status unknown if docker can not be asked", async () => {
      mockContainers(undefined);
      await UserServersService.instance.getServers(req, res);
      expect(res.json).toHaveBeenCalledWith([
        { ...serverWithHost(localHost), status: "unknown" },
      ]);
    });
    describe("servers on another host", () => {
      const fetchMock = jest.fn();
      const authedReq = {
        ...req,
        originalUrl: "/users/servers",
        headers: { authorization: "Bearer token" },
      } as unknown as Request;

      beforeEach(() => {
        global.fetch = fetchMock;
        fetchMock.mockReset();
        jest
          .spyOn(UserServersService.instance.prisma.server, "findMany")
          .mockResolvedValue([serverWithHost(remoteHost)] as never);
      });

      it("Should ask that host for the status, as this user", async () => {
        fetchMock.mockResolvedValue({
          ok: true,
          json: async () => [{ id: mockServerRecord.id, status: "running" }],
        });
        await UserServersService.instance.getServers(authedReq, res);
        expect(fetchMock).toHaveBeenCalledWith(
          `https://remote.example/2${Routes.PROXY}/users/servers`,
          expect.objectContaining({
            headers: { authorization: "Bearer token" },
          }),
        );
        expect(
          ServersService.instance.getContainerStatuses,
        ).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith([
          { ...serverWithHost(remoteHost), status: "running" },
        ]);
      });
      it("Should ask the cluster, not the other host, on Kubernetes", async () => {
        process.env.ORCHESTRATOR = "k8s";
        try {
          (
            ServersService.instance.getContainerStatuses as jest.Mock
          ).mockResolvedValue(new Map([["containerName", "running"]]));
          await UserServersService.instance.getServers(authedReq, res);
        } finally {
          delete process.env.ORCHESTRATOR;
        }
        expect(fetchMock).not.toHaveBeenCalled();
        expect(ServersService.instance.getContainerStatuses).toHaveBeenCalled();
      });
      it("Should report status unknown if that host can not be reached", async () => {
        fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED"));
        await UserServersService.instance.getServers(authedReq, res);
        expect(res.json).toHaveBeenCalledWith([
          { ...serverWithHost(remoteHost), status: "unknown" },
        ]);
      });
      it("Should report status unknown if that host answers with an error", async () => {
        fetchMock.mockResolvedValue({ ok: false });
        await UserServersService.instance.getServers(authedReq, res);
        expect(res.json).toHaveBeenCalledWith([
          { ...serverWithHost(remoteHost), status: "unknown" },
        ]);
      });
      it(`Should not ask other hosts for a request that starts with ${Routes.PROXY}`, async () => {
        await UserServersService.instance.getServers(
          {
            ...authedReq,
            originalUrl: `${Routes.PROXY}/users/servers`,
          } as unknown as Request,
          res,
        );
        expect(fetchMock).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith([
          { ...serverWithHost(remoteHost), status: "unknown" },
        ]);
      });
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
        UserServersService.instance.prisma.server.findMany,
      ).toHaveBeenCalledWith({
        select: UserServersService.defaultServerSelect,
        where: {
          users: {
            some: {
              userId: String(req.auth?.payload.sub),
            },
          },
        },
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [],
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("GET /:id", () => {
    it("Should return server", async () => {
      jest
        .spyOn(ServersService.instance, "getContainerStatuses")
        .mockResolvedValue(new Map());
      await UserServersService.instance.getServerById(req, res);
      expect(
        UserServersService.instance.prisma.server.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        select: UserServersService.defaultServerSelect,
        where: {
          id: mockServerRecord.id,
          users: {
            some: {
              userId: String(req.auth?.payload.sub),
            },
          },
        },
      });
      expect(res.json).toHaveBeenCalledWith({
        ...mockServerRecord,
        status: "stopped",
      });
    });
    it("Should include the status of the container", async () => {
      jest
        .spyOn(ServersService.instance, "getContainerStatuses")
        .mockResolvedValue(
          new Map([[mockServerRecord.containerName, "running"]]),
        );
      await UserServersService.instance.getServerById(req, res);
      expect(res.json).toHaveBeenCalledWith({
        ...mockServerRecord,
        status: "running",
      });
    });
    it("Should report status unknown if docker can not be asked", async () => {
      jest
        .spyOn(ServersService.instance, "getContainerStatuses")
        .mockResolvedValue(undefined);
      await UserServersService.instance.getServerById(req, res);
      expect(res.json).toHaveBeenCalledWith({
        ...mockServerRecord,
        status: "unknown",
      });
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
        UserServersService.instance.prisma.server.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        select: UserServersService.defaultServerSelect,
        where: {
          id: mockServerRecord.id,
          users: {
            some: {
              userId: String(req.auth?.payload.sub),
            },
          },
        },
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id],
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /:id", () => {
    it("Should delete server", async () => {
      await UserServersService.instance.deleteServer(req, res);
      expect(
        UserServersService.instance.prisma.user.findMany,
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
        UserServersService.instance.prisma.server.delete,
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecord.id,
          users: {
            every: {
              userId: String(req.auth?.payload.sub),
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
        UserServersService.instance.prisma.server.delete,
      ).toHaveBeenCalledWith({
        where: {
          id: mockServerRecord.id,
          users: {
            every: {
              userId: String(req.auth?.payload.sub),
            },
          },
        },
        select: UserServersService.defaultServerSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id],
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
        UserServersService.instance.prisma.server.findUniqueOrThrow,
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
        new UserServersService().stringToBoolean("badbooleantext"),
      ).toBeUndefined();
    });
    it("should return undefined for undefined", () => {
      expect(
        new UserServersService().stringToBoolean(undefined),
      ).toBeUndefined();
    });
    it("should return undefined for null", () => {
      expect(new UserServersService().stringToBoolean(null)).toBeUndefined();
    });
  });
});
