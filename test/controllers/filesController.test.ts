import { FilesController } from "../../src/controllers";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { FilesService } from "../../src/services";
jest.mock("@prisma/client");
jest.mock("../../src/services/filesService");

describe("FilesController", () => {
  const req: Request = jest.fn() as unknown as Request;
  const res: Response = jest.fn() as unknown as Response;
  const filesController = new FilesController();
  // @ts-ignore
  FilesService.instance = {
    createFile: jest.fn(),
    getFiles: jest.fn(),
    getFileById: jest.fn(),
    patchFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  it("should use passed in prisma client", () => {
    const prisma = new PrismaClient();
    new FilesController(prisma);
    expect(FilesService).toHaveBeenCalledWith(prisma);
  });

  describe("createFile", () => {
    it("should call createFile in FilesService", async () => {
      await filesController.createFile(req, res);
      expect(FilesService.instance.createFile).toHaveBeenCalledWith(req, res);
    });
  });

  describe("getFiles", () => {
    it("should call getFiles in FilesService", async () => {
      await filesController.getFiles(req, res);
      expect(FilesService.instance.getFiles).toHaveBeenCalledWith(req, res);
    });
  });

  describe("getFileById", () => {
    it("should call getFileById in FilesService", async () => {
      await filesController.getFileById(req, res);
      expect(FilesService.instance.getFileById).toHaveBeenCalledWith(req, res);
    });
  });

  describe("patchFile", () => {
    it("should call patchFile in FilesService", async () => {
      await filesController.patchFile(req, res);
      expect(FilesService.instance.patchFile).toHaveBeenCalledWith(req, res);
    });
  });

  describe("deleteFile", () => {
    it("should call deleteFile in FilesService", async () => {
      await filesController.deleteFile(req, res);
      expect(FilesService.instance.deleteFile).toHaveBeenCalledWith(req, res);
    });
  });
});
