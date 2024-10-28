import * as child_process from "child_process";
import { ServersService } from "../../src/services";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { handleDatabaseErrors } from "../../src/utils";
jest.mock("child_process");
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
  const body = { applicationName: "appName", containerName: "containerName" };
  const mockServerRecord = {
    id: "serverid",
    ...body,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const req: Request = {
    body,
    params: { id: mockServerRecord.id },
  } as unknown as Request;
  const res: Response = { json: jest.fn() } as unknown as Response;
  const serversService = new ServersService();
  beforeEach(() => {
    jest.clearAllMocks();

    (child_process.exec as unknown as jest.Mock).mockImplementation(
      (_, callback) => {
        callback(null, { stdout: "" });
      }
    );

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

  it("should use passed in prisma client", () => {
    const prisma = new PrismaClient();
    const serversService2 = new ServersService(prisma);
    expect(serversService2.prisma).toEqual(prisma);
  });

  describe("POST /", () => {
    it("should create a new server record and return the new record", async () => {
      await serversService.createServer(req, res);
      expect(serversService.prisma.server.create).toHaveBeenCalledWith({
        data: body,
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
        data: body,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("POST /:id/restart", () => {
    it("Should restart server", async () => {
      await serversService.restartServer(req, res);
      expect(
        serversService.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id },
      });
      expect(child_process.exec as unknown as jest.Mock).toHaveBeenCalledWith(
        `docker restart '${mockServerRecord.containerName}'`,
        expect.any(Function)
      );
      expect(res.json).toHaveBeenCalledWith(mockServerRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(serversService.prisma.server, "findUniqueOrThrow")
        .mockRejectedValue(new Error());
      try {
        await serversService.restartServer(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        serversService.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id },
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("GET /", () => {
    it("Should return list of servers", async () => {
      await serversService.getServers(req, res);
      expect(serversService.prisma.server.findMany).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([mockServerRecord]);
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
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("GET /:id", () => {
    it("Should return server", async () => {
      await serversService.getServerById(req, res);
      expect(
        serversService.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id },
      });
      expect(res.json).toHaveBeenCalledWith(mockServerRecord);
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
        serversService.prisma.server.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id },
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /:id", () => {
    it("Should patch server", async () => {
      await serversService.patchServer(req, res);
      expect(serversService.prisma.server.update).toHaveBeenCalledWith({
        data: { ...body },
        where: { id: mockServerRecord.id },
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
        data: { ...body },
        where: { id: mockServerRecord.id },
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
      await serversService.deleteServer(req, res);
      expect(serversService.prisma.server.delete).toHaveBeenCalledWith({
        where: { id: mockServerRecord.id },
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
        where: { id: mockServerRecord.id },
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "server",
        [mockServerRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
