import { FilesService } from "../../src/services";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { handleDatabaseErrors } from "../../src/utils";
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      return {
        file: {
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

describe("FilesService", () => {
  const params = { hostId: "hostId", serverId: "serverId" };
  const body = { name: "", content: "" };
  const mockFileRecord = {
    ...body,
    id: "fileid",
    serverId: params.serverId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const req: Request = {
    body,
    // In some routes, the file id is not used, but the code
    // should be able to handle that anyways.
    params: {
      hostId: params.hostId,
      serverId: params.serverId,
      fileId: mockFileRecord.id,
    },
  } as unknown as Request;
  const res: Response = { json: jest.fn() } as unknown as Response;
  const where = {
    id: mockFileRecord.id,
    server: { id: params.serverId, hostId: params.hostId },
  };
  const data = {
    serverId: params.serverId,
    ...body,
  };
  const filesService = new FilesService();
  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .spyOn(filesService.prisma.file, "create")
      .mockResolvedValue(mockFileRecord);
    jest
      .spyOn(filesService.prisma.file, "findMany")
      .mockResolvedValue([mockFileRecord]);
    jest
      .spyOn(filesService.prisma.file, "findUniqueOrThrow")
      .mockResolvedValue(mockFileRecord);
    jest
      .spyOn(filesService.prisma.file, "update")
      .mockResolvedValue(mockFileRecord);
    jest
      .spyOn(filesService.prisma.file, "delete")
      .mockResolvedValue(mockFileRecord);
  });

  it("should use passed in prisma client if no prisma client is set", () => {
    // @ts-expect-error to make testing easier
    FilesService.instance.prisma = undefined;
    const prisma = new PrismaClient();
    const filesService2 = new FilesService(prisma);
    expect(filesService2.prisma).toEqual(prisma);
  });

  it("should use existing prisma client even if another is passed in", () => {
    const currentPrisma = FilesService.instance.prisma;
    const prisma = new PrismaClient();
    const filesService2 = new FilesService(prisma);
    expect(filesService2.prisma).toEqual(currentPrisma);
  });

  describe("POST /", () => {
    it("should create a new file record and return the new record", async () => {
      await filesService.createFile(req, res);
      expect(filesService.prisma.file.create).toHaveBeenCalledWith({
        data,
        select: FilesService.defaultFileSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockFileRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(filesService.prisma.file, "create")
        .mockRejectedValue(new Error());
      try {
        await filesService.createFile(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(filesService.prisma.file.create).toHaveBeenCalledWith({
        data,
        select: FilesService.defaultFileSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "file",
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("GET /", () => {
    it("Should return list of files", async () => {
      await filesService.getFiles(req, res);
      expect(filesService.prisma.file.findMany).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([mockFileRecord]);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(filesService.prisma.file, "findMany")
        .mockRejectedValue(new Error());
      try {
        await filesService.getFiles(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(filesService.prisma.file.findMany).toHaveBeenCalled();
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "file",
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("GET /:id", () => {
    it("Should return file", async () => {
      await filesService.getFileById(req, res);
      expect(filesService.prisma.file.findUniqueOrThrow).toHaveBeenCalledWith({
        where,
        select: FilesService.defaultFileSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockFileRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(filesService.prisma.file, "findUniqueOrThrow")
        .mockRejectedValue(new Error());
      try {
        await filesService.getFileById(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(filesService.prisma.file.findUniqueOrThrow).toHaveBeenCalledWith({
        where,
        select: FilesService.defaultFileSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "file",
        [mockFileRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /:id", () => {
    it("Should patch file", async () => {
      await filesService.patchFile(req, res);
      expect(filesService.prisma.file.update).toHaveBeenCalledWith({
        data: { ...body },
        where,
        select: FilesService.defaultFileSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockFileRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(filesService.prisma.file, "update")
        .mockRejectedValue(new Error());
      try {
        await filesService.patchFile(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(filesService.prisma.file.update).toHaveBeenCalledWith({
        data: { ...body },
        where,
        select: FilesService.defaultFileSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "file",
        [mockFileRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /:id", () => {
    it("Should delete file", async () => {
      await filesService.deleteFile(req, res);
      expect(filesService.prisma.file.delete).toHaveBeenCalledWith({
        where,
        select: FilesService.defaultFileSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockFileRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(filesService.prisma.file, "delete")
        .mockRejectedValue(new Error());
      try {
        await filesService.deleteFile(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(filesService.prisma.file.delete).toHaveBeenCalledWith({
        where,
        select: FilesService.defaultFileSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "file",
        [mockFileRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
