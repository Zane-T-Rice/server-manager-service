import { VolumesService } from "../../src/services";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { handleDatabaseErrors } from "../../src/utils";
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      return {
        volume: {
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

describe("VolumesService", () => {
  const commonParams = { serverId: "serverId" };
  const body = { hostPath: "/host/path", containerPath: "/container/Path" };
  const mockVolumeRecord = {
    id: "volumeid",
    ...commonParams,
    ...body,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const req: Request = {
    body,
    // In some routes, the volume id is not used, but the code
    // should be able to handle that anyways.
    params: {
      id: mockVolumeRecord.id,
      serverId: mockVolumeRecord.serverId,
    },
  } as unknown as Request;
  const res: Response = { json: jest.fn() } as unknown as Response;
  const volumesService = new VolumesService();
  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .spyOn(volumesService.prisma.volume, "create")
      .mockResolvedValue(mockVolumeRecord);
    jest
      .spyOn(volumesService.prisma.volume, "findMany")
      .mockResolvedValue([mockVolumeRecord]);
    jest
      .spyOn(volumesService.prisma.volume, "findUniqueOrThrow")
      .mockResolvedValue(mockVolumeRecord);
    jest
      .spyOn(volumesService.prisma.volume, "update")
      .mockResolvedValue(mockVolumeRecord);
    jest
      .spyOn(volumesService.prisma.volume, "delete")
      .mockResolvedValue(mockVolumeRecord);
  });

  it("should use passed in prisma client if no prisma client is set", () => {
    // @ts-ignore
    VolumesService.instance.prisma = undefined;
    const prisma = new PrismaClient();
    const volumesService2 = new VolumesService(prisma);
    expect(volumesService2.prisma).toEqual(prisma);
  });

  it("should use existing prisma client even if another is passed in", () => {
    const currentPrisma = VolumesService.instance.prisma;
    const prisma = new PrismaClient();
    const volumesService2 = new VolumesService(prisma);
    expect(volumesService2.prisma).toEqual(currentPrisma);
  });

  describe("POST /", () => {
    it("should create a new volume record and return the new record", async () => {
      await volumesService.createVolume(req, res);
      expect(volumesService.prisma.volume.create).toHaveBeenCalledWith({
        data: {
          ...commonParams,
          ...body,
        },
        select: VolumesService.defaultVolumeSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockVolumeRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(volumesService.prisma.volume, "create")
        .mockRejectedValue(new Error());
      try {
        await volumesService.createVolume(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(volumesService.prisma.volume.create).toHaveBeenCalledWith({
        data: {
          ...body,
          ...commonParams,
        },
        select: VolumesService.defaultVolumeSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "volume",
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("GET /", () => {
    it("Should return list of volumes", async () => {
      await volumesService.getVolumes(req, res);
      expect(volumesService.prisma.volume.findMany).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([mockVolumeRecord]);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(volumesService.prisma.volume, "findMany")
        .mockRejectedValue(new Error());
      try {
        await volumesService.getVolumes(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(volumesService.prisma.volume.findMany).toHaveBeenCalled();
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "volume",
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("GET /:id", () => {
    it("Should return volume", async () => {
      await volumesService.getVolumeById(req, res);
      expect(
        volumesService.prisma.volume.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: mockVolumeRecord.id,
          serverId: mockVolumeRecord.serverId,
        },
        select: VolumesService.defaultVolumeSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockVolumeRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(volumesService.prisma.volume, "findUniqueOrThrow")
        .mockRejectedValue(new Error());
      try {
        await volumesService.getVolumeById(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        volumesService.prisma.volume.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where: {
          id: mockVolumeRecord.id,
          serverId: mockVolumeRecord.serverId,
        },
        select: VolumesService.defaultVolumeSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "volume",
        [mockVolumeRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /:id", () => {
    it("Should patch volume", async () => {
      await volumesService.patchVolume(req, res);
      expect(volumesService.prisma.volume.update).toHaveBeenCalledWith({
        data: { ...body },
        where: {
          id: mockVolumeRecord.id,
          serverId: mockVolumeRecord.serverId,
        },
        select: VolumesService.defaultVolumeSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockVolumeRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(volumesService.prisma.volume, "update")
        .mockRejectedValue(new Error());
      try {
        await volumesService.patchVolume(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(volumesService.prisma.volume.update).toHaveBeenCalledWith({
        data: { ...body },
        where: {
          id: mockVolumeRecord.id,
          serverId: mockVolumeRecord.serverId,
        },
        select: VolumesService.defaultVolumeSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "volume",
        [mockVolumeRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /:id", () => {
    it("Should delete volume", async () => {
      await volumesService.deleteVolume(req, res);
      expect(volumesService.prisma.volume.delete).toHaveBeenCalledWith({
        where: {
          id: mockVolumeRecord.id,
          serverId: mockVolumeRecord.serverId,
        },
        select: VolumesService.defaultVolumeSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockVolumeRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(volumesService.prisma.volume, "delete")
        .mockRejectedValue(new Error());
      try {
        await volumesService.deleteVolume(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(volumesService.prisma.volume.delete).toHaveBeenCalledWith({
        where: {
          id: mockVolumeRecord.id,
          serverId: mockVolumeRecord.serverId,
        },
        select: VolumesService.defaultVolumeSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "volume",
        [mockVolumeRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
