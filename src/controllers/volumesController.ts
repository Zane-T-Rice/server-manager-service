import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { VolumesService } from "../services";

class VolumesController {
  static instance: VolumesController;

  constructor(prisma?: PrismaClient) {
    new VolumesService(prisma); // Initialize VolumesService singleton.
    VolumesController.instance = VolumesController.instance ?? this;
    return VolumesController.instance;
  }

  /* POST a new volume. */
  async createVolume(req: Request, res: Response) {
    await VolumesService.instance.createVolume(req, res);
  }

  /* GET all volumes. */
  async getVolumes(req: Request, res: Response) {
    await VolumesService.instance.getVolumes(req, res);
  }

  /* GET volume by id. */
  async getVolumeById(req: Request, res: Response) {
    await VolumesService.instance.getVolumeById(req, res);
  }

  /* PATCH an existing volume. */
  async patchVolume(req: Request, res: Response) {
    await VolumesService.instance.patchVolume(req, res);
  }

  /* DELETE an existing volume. */
  async deleteVolume(req: Request, res: Response) {
    await VolumesService.instance.deleteVolume(req, res);
  }
}

export { VolumesController };
