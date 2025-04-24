import { HostsService } from "../../src/services";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { handleDatabaseErrors } from "../../src/utils";
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      return {
        host: {
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

describe("HostsService", () => {
  const body = { name: "host name", url: "https://localhost:3000" };
  const mockHostRecord = {
    id: "hostid",
    ...body,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const req: Request = {
    body,
    // In some routes, the host id is not used, but the code
    // should be able to handle that anyways.
    params: {
      hostId: mockHostRecord.id,
    },
  } as unknown as Request;
  const res: Response = { json: jest.fn() } as unknown as Response;
  const hostsService = new HostsService();
  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .spyOn(hostsService.prisma.host, "create")
      .mockResolvedValue(mockHostRecord);
    jest
      .spyOn(hostsService.prisma.host, "findMany")
      .mockResolvedValue([mockHostRecord]);
    jest
      .spyOn(hostsService.prisma.host, "findUniqueOrThrow")
      .mockResolvedValue(mockHostRecord);
    jest
      .spyOn(hostsService.prisma.host, "update")
      .mockResolvedValue(mockHostRecord);
    jest
      .spyOn(hostsService.prisma.host, "delete")
      .mockResolvedValue(mockHostRecord);
  });

  it("should use passed in prisma client if no prisma client is set", () => {
    // @ts-expect-error to make testing easier
    HostsService.instance.prisma = undefined;
    const prisma = new PrismaClient();
    const hostsService2 = new HostsService(prisma);
    expect(hostsService2.prisma).toEqual(prisma);
  });

  it("should use existing prisma client even if another is passed in", () => {
    const currentPrisma = HostsService.instance.prisma;
    const prisma = new PrismaClient();
    const hostsService2 = new HostsService(prisma);
    expect(hostsService2.prisma).toEqual(currentPrisma);
  });

  describe("POST /", () => {
    it("should create a new host record and return the new record", async () => {
      await hostsService.createHost(req, res);
      expect(hostsService.prisma.host.create).toHaveBeenCalledWith({
        data: {
          ...body,
        },
        select: HostsService.defaultHostSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockHostRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(hostsService.prisma.host, "create")
        .mockRejectedValue(new Error());
      try {
        await hostsService.createHost(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(hostsService.prisma.host.create).toHaveBeenCalledWith({
        data: {
          ...body,
        },
        select: HostsService.defaultHostSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "host",
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("GET /", () => {
    it("Should return list of hosts", async () => {
      await hostsService.getHosts(req, res);
      expect(hostsService.prisma.host.findMany).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([mockHostRecord]);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(hostsService.prisma.host, "findMany")
        .mockRejectedValue(new Error());
      try {
        await hostsService.getHosts(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(hostsService.prisma.host.findMany).toHaveBeenCalled();
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "host",
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("GET /:id", () => {
    it("Should return host", async () => {
      await hostsService.getHostById(req, res);
      expect(hostsService.prisma.host.findUniqueOrThrow).toHaveBeenCalledWith({
        where: {
          id: mockHostRecord.id,
        },
        select: HostsService.defaultHostSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockHostRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(hostsService.prisma.host, "findUniqueOrThrow")
        .mockRejectedValue(new Error());
      try {
        await hostsService.getHostById(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(hostsService.prisma.host.findUniqueOrThrow).toHaveBeenCalledWith({
        where: {
          id: mockHostRecord.id,
        },
        select: HostsService.defaultHostSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "host",
        [mockHostRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /:id", () => {
    it("Should patch host", async () => {
      await hostsService.patchHost(req, res);
      expect(hostsService.prisma.host.update).toHaveBeenCalledWith({
        data: { ...body },
        where: {
          id: mockHostRecord.id,
        },
        select: HostsService.defaultHostSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockHostRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(hostsService.prisma.host, "update")
        .mockRejectedValue(new Error());
      try {
        await hostsService.patchHost(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(hostsService.prisma.host.update).toHaveBeenCalledWith({
        data: { ...body },
        where: {
          id: mockHostRecord.id,
        },
        select: HostsService.defaultHostSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "host",
        [mockHostRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /:id", () => {
    it("Should delete host", async () => {
      await hostsService.deleteHost(req, res);
      expect(hostsService.prisma.host.delete).toHaveBeenCalledWith({
        where: {
          id: mockHostRecord.id,
        },
        select: HostsService.defaultHostSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockHostRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(hostsService.prisma.host, "delete")
        .mockRejectedValue(new Error());
      try {
        await hostsService.deleteHost(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(hostsService.prisma.host.delete).toHaveBeenCalledWith({
        where: {
          id: mockHostRecord.id,
        },
        select: HostsService.defaultHostSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "host",
        [mockHostRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
