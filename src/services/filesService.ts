import { Request, Response } from "express";
import { handleDatabaseErrors } from "../utils/handleDatabaseErrors";
import { PrismaClient } from "@prisma/client";

class FilesService {
  static instance: FilesService;
  prisma: PrismaClient;

  static defaultFileSelect = {
    id: true,
    content: true,
    name: true,
  };

  constructor(prisma?: PrismaClient) {
    FilesService.instance = FilesService.instance ?? this;
    FilesService.instance.prisma =
      FilesService.instance.prisma ?? prisma ?? new PrismaClient();
    this.prisma = FilesService.instance.prisma; // Effectively initializes PrismaClient as a singleton.
    return FilesService.instance;
  }

  /* POST a new file. */
  async createFile(req: Request, res: Response) {
    const { serverId } = req.params;
    const { content, name } = req.body;
    const file = await this.prisma.file
      .create({
        data: {
          serverId,
          content,
          name,
        },
        select: FilesService.defaultFileSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "file", []));
    res.json(file);
  }

  /* GET all file. */
  async getFiles(req: Request, res: Response) {
    const { serverId } = req.params;
    const files = await this.prisma.file
      .findMany({
        where: { serverId: String(serverId) },
        select: FilesService.defaultFileSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "file", []));
    res.json(files);
  }

  /* GET file by id. */
  async getFileById(req: Request, res: Response) {
    const { fileId, serverId } = req.params;
    const file = await this.prisma.file
      .findUniqueOrThrow({
        where: { id: String(fileId), serverId: String(serverId) },
        select: FilesService.defaultFileSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "file", [fileId]));
    res.json(file);
  }

  /* PATCH an existing file. */
  async patchFile(req: Request, res: Response) {
    const { fileId, serverId } = req.params;
    const { content, name } = req.body;
    const file = await this.prisma.file
      .update({
        where: { id: String(fileId), serverId: String(serverId) },
        data: {
          content,
          name,
        },
        select: FilesService.defaultFileSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "file", [fileId]));
    res.json(file);
  }

  /* DELETE an existing file. */
  async deleteFile(req: Request, res: Response) {
    const { fileId, serverId } = req.params;
    const file = await this.prisma.file
      .delete({
        where: { id: String(fileId), serverId: String(serverId) },
        select: FilesService.defaultFileSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "file", [fileId]));
    res.json(file);
  }
}

export { FilesService };
