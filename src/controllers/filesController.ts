import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { FilesService } from "../services";

class FilesController {
  static instance: FilesController;

  constructor(prisma?: PrismaClient) {
    new FilesService(prisma); // Initialize FilesService singleton.
    FilesController.instance = FilesController.instance ?? this;
    return FilesController.instance;
  }

  /* POST a new File. */
  async createFile(req: Request, res: Response) {
    await FilesService.instance.createFile(req, res);
  }

  /* GET all Files. */
  async getFiles(req: Request, res: Response) {
    await FilesService.instance.getFiles(req, res);
  }

  /* GET File by id. */
  async getFileById(req: Request, res: Response) {
    await FilesService.instance.getFileById(req, res);
  }

  /* PATCH a new File. */
  async patchFile(req: Request, res: Response) {
    await FilesService.instance.patchFile(req, res);
  }

  /* DELETE an existing File. */
  async deleteFile(req: Request, res: Response) {
    await FilesService.instance.deleteFile(req, res);
  }
}

export { FilesController };
