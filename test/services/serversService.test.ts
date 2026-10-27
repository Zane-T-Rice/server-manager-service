import { ServersService } from "../../src/services";
import { PrismaClient, Server } from "@prisma/client";
import { Request, Response } from "express";
import { handleDatabaseErrors } from "../../src/utils";
import * as k8sOrchestrator from "../../src/services/orchestrator/k8sOrchestrator";
jest.mock("../../src/services/orchestrator/k8sOrchestrator");
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
      };
    }),
  };
});
jest.mock("../../src/utils/handleDatabaseErrors", () => {
  return {
    handleDatabaseErrors: jest.fn().mockRejectedValue(new Error()),
  };
});
describe("ServersService", () => {
  const hostId = "hostId";
  const body = {
    applicationName: "appName",
    containerName: "containerName",
    isInResponseChain: false,
    isUpdatable: false,
  };
  const mockServerRecord = {
    id: "serverid",
    ...body,
  } as Server;
  const req: Request = {
    body,
    query: {},
    params: { hostId, serverId: mockServerRecord.id },
  } as unknown as Request;
  const res: Response = { json: jest.fn() } as unknown as Response;
  const serversService = new ServersService();
  beforeEach(() => {
    jest.clearAllMocks();

    (k8sOrchestrator.getStatuses as jest.Mock).mockResolvedValue(new Map());

    jest
      .spyOn(serversService.prisma.server, "create")
      .mockResolvedValue(mockServerRecord);
    jest
      .spyOn(serversService.prisma.server, "findMany")
      .mockResolvedValue([mockServerRecord]);
    jest
      .spyOn(serversService.prisma.server, "findUniqueOrThrow")
      .mockResolvedValue(mockServerRecord);
    jest
      .spyOn(serversService.prisma.server, "update")
      .mockResolvedValue(mockServerRecord);
    jest
      .spyOn(serversService.prisma.server, "delete")
      .mockResolvedValue(mockServerRecord);
  });

  it("should use passed in prisma client if no prisma client is set", () => {
    // @ts-expect-error to make testing easier
    ServersService.instance.prisma = undefined;
    const prisma = new PrismaClient();
    const serversService2 = new ServersService(prisma);
    expect(serversService2.prisma).toEqual(prisma);
  });

  it("should use existing prisma client even if another is passed in", () => {
    const currentPrisma = ServersService.instance.prisma;
    const prisma = new PrismaClient();
    const serversService2 = new ServersService(prisma);
    expect(serversService2.prisma).toEqual(currentPrisma);
  });

  describe("POST /", () => {
    it("should create a new server record and return the new record", async () => {
      await serversService.createServer(req, res);
      expect(serversService.prisma.server.create).toHaveBeenCalledWith({
        data: { ...body, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockServerRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "create")
        .mockRejectedValue(new Error());
      try {
        await serversService.createServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(serversService.prisma.server.create).toHaveBeenCalledWith({
        data: { ...body, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [],
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("POST /:id/stop", () => {
    const flushReq = {
      ...req,
      log: { flush: jest.fn() },
    } as unknown as Request;
    it("Should remove the server, then respond", async () => {
      await serversService.stopServer(flushReq, res);
      expect(
        serversService.prisma.server.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(k8sOrchestrator.removeServer).toHaveBeenCalledWith(
        mockServerRecord,
      );
      expect(res.json).toHaveBeenCalledWith(mockServerRecord);
      expect(flushReq.log.flush).not.toHaveBeenCalled();
    });
    it("Should respond before removing a server in the response chain", async () => {
      jest
        .spyOn(serversService.prisma.server, "findUniqueOrThrow")
        .mockResolvedValue({ ...mockServerRecord, isInResponseChain: true });
      await serversService.stopServer(flushReq, res);
      expect(flushReq.log.flush).toHaveBeenCalled();
      expect((res.json as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
        (k8sOrchestrator.removeServer as jest.Mock).mock.invocationCallOrder[0],
      );
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "findUniqueOrThrow")
        .mockRejectedValue(new Error());
      try {
        await serversService.stopServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        serversService.prisma.server.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id],
      );
      expect(k8sOrchestrator.removeServer).not.toHaveBeenCalled();
    });
  });

  describe("POST /:id/update", () => {
    const completeServer = {
      ...mockServerRecord,
      isInResponseChain: false,
      isUpdatable: true,
      ports: [{ id: "p", number: 3000, protocol: "tcp" }],
      volumes: [{ id: "v", hostPath: "/srv/a", containerPath: "/a" }],
      environmentVariables: [{ id: "e", name: "ENV", value: "local" }],
      files: [{ id: "f", name: "Dockerfile", content: "RlJPTQ==" }],
      host: { name: "server-1" },
    };
    const expectedSpec = {
      id: mockServerRecord.id,
      containerName: mockServerRecord.containerName,
      hostName: "server-1",
      ports: completeServer.ports,
      volumes: completeServer.volumes,
      environmentVariables: completeServer.environmentVariables,
      files: completeServer.files,
    };
    const flushReq = {
      ...req,
      log: { flush: jest.fn() },
    } as unknown as Request;
    const calledBefore = (first: jest.Mock, second: jest.Mock) =>
      first.mock.invocationCallOrder[0] < second.mock.invocationCallOrder[0];

    it("Should build and apply the server, then respond", async () => {
      jest
        .spyOn(serversService.prisma.server, "findUniqueOrThrow")
        .mockResolvedValue(completeServer);
      await serversService.updateServer(flushReq, res);
      expect(
        serversService.prisma.server.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId, isUpdatable: true },
        select: ServersService.completeServerSelect,
      });
      expect(k8sOrchestrator.buildImage).toHaveBeenCalledWith(expectedSpec);
      expect(k8sOrchestrator.applyServer).toHaveBeenCalledWith(expectedSpec);
      expect(
        calledBefore(
          k8sOrchestrator.applyServer as jest.Mock,
          res.json as jest.Mock,
        ),
      ).toBe(true);
      expect(res.json).toHaveBeenCalledWith({
        ...mockServerRecord,
        isInResponseChain: false,
        isUpdatable: true,
      });
    });
    it("Should respond before applying a server in the response chain", async () => {
      jest
        .spyOn(serversService.prisma.server, "findUniqueOrThrow")
        .mockResolvedValue({ ...completeServer, isInResponseChain: true });
      await serversService.updateServer(flushReq, res);
      expect(flushReq.log.flush).toHaveBeenCalled();
      expect(k8sOrchestrator.buildImage).toHaveBeenCalledWith(expectedSpec);
      expect(
        calledBefore(
          res.json as jest.Mock,
          k8sOrchestrator.applyServer as jest.Mock,
        ),
      ).toBe(true);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "findUniqueOrThrow")
        .mockRejectedValue(new Error());
      try {
        await serversService.updateServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        serversService.prisma.server.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId, isUpdatable: true },
        select: ServersService.completeServerSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id],
      );
      expect(k8sOrchestrator.buildImage).not.toHaveBeenCalled();
    });
  });

  describe("stringToBoolean", () => {
    it('should return true for "true"', () => {
      expect(serversService.stringToBoolean("true")).toBe(true);
    });
    it('should return false for "false"', () => {
      expect(serversService.stringToBoolean("false")).toBe(false);
    });
    it('should return undefined for "badbooleantext"', () => {
      expect(serversService.stringToBoolean("badbooleantext")).toBeUndefined();
    });
    it("should return undefined for undefined", () => {
      expect(serversService.stringToBoolean(undefined)).toBeUndefined();
    });
    it("should return undefined for null", () => {
      expect(serversService.stringToBoolean(null)).toBeUndefined();
    });
  });

  describe("GET /", () => {
    it("Should return list of servers", async () => {
      await serversService.getServers(req, res);
      expect(serversService.prisma.server.findMany).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([
        { ...mockServerRecord, status: "stopped" },
      ]);
    });
    it("Should include the status of each server, by id", async () => {
      (k8sOrchestrator.getStatuses as jest.Mock).mockResolvedValue(
        new Map([
          ["other", "exited"],
          [mockServerRecord.id, "running"],
        ]),
      );
      await serversService.getServers(req, res);
      expect(res.json).toHaveBeenCalledWith([
        { ...mockServerRecord, status: "running" },
      ]);
    });
    it("Should report status unknown if the cluster can not be asked", async () => {
      (k8sOrchestrator.getStatuses as jest.Mock).mockResolvedValue(undefined);
      await serversService.getServers(req, res);
      expect(res.json).toHaveBeenCalledWith([
        { ...mockServerRecord, status: "unknown" },
      ]);
    });
    it("Should return list of servers that are updatable", async () => {
      const isUpdatableRequest: Request = {
        ...req,
        query: {
          isUpdatable: "true",
        },
      } as unknown as Request;
      await serversService.getServers(isUpdatableRequest, res);
      expect(serversService.prisma.server.findMany).toHaveBeenCalledWith({
        select: ServersService.defaultServerSelect,
        where: { hostId, isUpdatable: true },
      });
      expect(res.json).toHaveBeenCalledWith([
        { ...mockServerRecord, status: "stopped" },
      ]);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "findMany")
        .mockRejectedValue(new Error());
      try {
        await serversService.getServers(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(serversService.prisma.server.findMany).toHaveBeenCalled();
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
      await serversService.getServerById(req, res);
      expect(
        serversService.prisma.server.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(res.json).toHaveBeenCalledWith({
        ...mockServerRecord,
        status: "stopped",
      });
    });
    it("Should include the status of the server", async () => {
      (k8sOrchestrator.getStatuses as jest.Mock).mockResolvedValue(
        new Map([[mockServerRecord.id, "running"]]),
      );
      await serversService.getServerById(req, res);
      expect(res.json).toHaveBeenCalledWith({
        ...mockServerRecord,
        status: "running",
      });
    });
    it("Should report status unknown if the cluster can not be asked", async () => {
      (k8sOrchestrator.getStatuses as jest.Mock).mockResolvedValue(undefined);
      await serversService.getServerById(req, res);
      expect(res.json).toHaveBeenCalledWith({
        ...mockServerRecord,
        status: "unknown",
      });
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "findUniqueOrThrow")
        .mockRejectedValue(new Error());
      try {
        await serversService.getServerById(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        serversService.prisma.server.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id],
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /:id", () => {
    it("Should patch server", async () => {
      await serversService.patchServer(req, res);
      expect(serversService.prisma.server.update).toHaveBeenCalledWith({
        data: { ...body, hostId },
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockServerRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "update")
        .mockRejectedValue(new Error());
      try {
        await serversService.patchServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(serversService.prisma.server.update).toHaveBeenCalledWith({
        data: { ...body, hostId },
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
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
      await serversService.deleteServer(req, res);
      expect(serversService.prisma.server.delete).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockServerRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "delete")
        .mockRejectedValue(new Error());
      try {
        await serversService.deleteServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(serversService.prisma.server.delete).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id, hostId },
        select: ServersService.defaultServerSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id],
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
