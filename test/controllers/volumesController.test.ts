import { VolumesController } from "../../src/controllers";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { VolumesService } from "../../src/services";
jest.mock("@prisma/client");
jest.mock("../../src/services/volumesService");

describe("VolumesController", () => {
  const req: Request = jest.fn() as unknown as Request;
  const res: Response = jest.fn() as unknown as Response;
  const volumesController = new VolumesController();
  // @ts-ignore
  VolumesService.instance = {
    createVolume: jest.fn(),
    getVolumes: jest.fn(),
    getVolumeById: jest.fn(),
    patchVolume: jest.fn(),
    deleteVolume: jest.fn(),
  };

  it("should use passed in prisma client", () => {
    const prisma = new PrismaClient();
    new VolumesController(prisma);
    expect(VolumesService).toHaveBeenCalledWith(prisma);
  });

  describe("createVolume", () => {
    it("should call createVolume in VolumesService", async () => {
      await volumesController.createVolume(req, res);
      expect(VolumesService.instance.createVolume).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });

  describe("getVolumes", () => {
    it("should call getVolumes in VolumesService", async () => {
      await volumesController.getVolumes(req, res);
      expect(VolumesService.instance.getVolumes).toHaveBeenCalledWith(req, res);
    });
  });

  describe("getVolumeById", () => {
    it("should call getVolumeById in VolumesService", async () => {
      await volumesController.getVolumeById(req, res);
      expect(VolumesService.instance.getVolumeById).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });

  describe("patchVolume", () => {
    it("should call patchVolume in VolumesService", async () => {
      await volumesController.patchVolume(req, res);
      expect(VolumesService.instance.patchVolume).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });

  describe("deleteVolume", () => {
    it("should call deleteVolume in VolumesService", async () => {
      await volumesController.deleteVolume(req, res);
      expect(VolumesService.instance.deleteVolume).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });
});
