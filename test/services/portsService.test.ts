import { PortsService } from "../../src/services";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { handleDatabaseErrors } from "../../src/utils";
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      return {
        port: {
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

describe("PortsService", () => {
  const params = { hostId: "hostId", serverId: "serverId" };
  const body = { number: 80, protocol: "tcp" };
  const mockPortRecord = {
    ...body,
    id: "portid",
    serverId: params.serverId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const req: Request = {
    body,
    // In some routes, the port id is not used, but the code
    // should be able to handle that anyways.
    params: {
      hostId: params.hostId,
      serverId: params.serverId,
      portId: mockPortRecord.id,
    },
  } as unknown as Request;
  const res: Response = { json: jest.fn() } as unknown as Response;
  const where = {
    id: mockPortRecord.id,
    server: { id: params.serverId, hostId: params.hostId },
  };
  const data = {
    serverId: params.serverId,
    ...body,
  };
  const portsService = new PortsService();
  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .spyOn(portsService.prisma.port, "create")
      .mockResolvedValue(mockPortRecord);
    jest
      .spyOn(portsService.prisma.port, "findMany")
      .mockResolvedValue([mockPortRecord]);
    jest
      .spyOn(portsService.prisma.port, "findUniqueOrThrow")
      .mockResolvedValue(mockPortRecord);
    jest
      .spyOn(portsService.prisma.port, "update")
      .mockResolvedValue(mockPortRecord);
    jest
      .spyOn(portsService.prisma.port, "delete")
      .mockResolvedValue(mockPortRecord);
  });

  it("should use passed in prisma client if no prisma client is set", () => {
    // @ts-expect-error to make testing easier
    PortsService.instance.prisma = undefined;
    const prisma = new PrismaClient();
    const portsService2 = new PortsService(prisma);
    expect(portsService2.prisma).toEqual(prisma);
  });

  it("should use existing prisma client even if another is passed in", () => {
    const currentPrisma = PortsService.instance.prisma;
    const prisma = new PrismaClient();
    const portsService2 = new PortsService(prisma);
    expect(portsService2.prisma).toEqual(currentPrisma);
  });

  describe("POST /", () => {
    it("should create a new port record and return the new record", async () => {
      await portsService.createPort(req, res);
      expect(portsService.prisma.port.create).toHaveBeenCalledWith({
        data,
        select: PortsService.defaultPortSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockPortRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(portsService.prisma.port, "create")
        .mockRejectedValue(new Error());
      try {
        await portsService.createPort(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(portsService.prisma.port.create).toHaveBeenCalledWith({
        data,
        select: PortsService.defaultPortSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "port",
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("GET /", () => {
    it("Should return list of ports", async () => {
      await portsService.getPorts(req, res);
      expect(portsService.prisma.port.findMany).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([mockPortRecord]);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(portsService.prisma.port, "findMany")
        .mockRejectedValue(new Error());
      try {
        await portsService.getPorts(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(portsService.prisma.port.findMany).toHaveBeenCalled();
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "port",
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("GET /:id", () => {
    it("Should return port", async () => {
      await portsService.getPortById(req, res);
      expect(portsService.prisma.port.findUniqueOrThrow).toHaveBeenCalledWith({
        where,
        select: PortsService.defaultPortSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockPortRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(portsService.prisma.port, "findUniqueOrThrow")
        .mockRejectedValue(new Error());
      try {
        await portsService.getPortById(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(portsService.prisma.port.findUniqueOrThrow).toHaveBeenCalledWith({
        where,
        select: PortsService.defaultPortSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "port",
        [mockPortRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /:id", () => {
    it("Should patch port", async () => {
      await portsService.patchPort(req, res);
      expect(portsService.prisma.port.update).toHaveBeenCalledWith({
        data: { ...body },
        where,
        select: PortsService.defaultPortSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockPortRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(portsService.prisma.port, "update")
        .mockRejectedValue(new Error());
      try {
        await portsService.patchPort(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(portsService.prisma.port.update).toHaveBeenCalledWith({
        data: { ...body },
        where,
        select: PortsService.defaultPortSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "port",
        [mockPortRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /:id", () => {
    it("Should delete port", async () => {
      await portsService.deletePort(req, res);
      expect(portsService.prisma.port.delete).toHaveBeenCalledWith({
        where,
        select: PortsService.defaultPortSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockPortRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(portsService.prisma.port, "delete")
        .mockRejectedValue(new Error());
      try {
        await portsService.deletePort(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(portsService.prisma.port.delete).toHaveBeenCalledWith({
        where,
        select: PortsService.defaultPortSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "port",
        [mockPortRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
