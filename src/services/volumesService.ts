import { Request, Response } from "express";
import { handleDatabaseErrors } from "../utils/handleDatabaseErrors";
import { PrismaClient } from "@prisma/client";

class VolumesService {
  static instance: VolumesService;
  prisma: PrismaClient;

  static defaultVolumeSelect = {
    id: true,
    hostPath: true,
    containerPath: true,
  };

  constructor(prisma?: PrismaClient) {
    VolumesService.instance = VolumesService.instance ?? this;
    VolumesService.instance.prisma =
      VolumesService.instance.prisma ?? prisma ?? new PrismaClient();
    this.prisma = VolumesService.instance.prisma; // Effectively initializes PrismaClient as a singleton.
    return VolumesService.instance;
  }

  /* POST a new volume. */
  async createVolume(req: Request, res: Response) {
    const { serverId } = req.params;
    const { hostPath, containerPath } = req.body;
    const volume = await this.prisma.volume
      .create({
        data: {
          serverId,
          hostPath,
          containerPath,
        },
        select: VolumesService.defaultVolumeSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "volume", []));
    res.json(volume);
  }

  /* GET all volume. */
  async getVolumes(req: Request, res: Response) {
    const { serverId } = req.params;
    const volumes = await this.prisma.volume
      .findMany({
        where: { serverId: String(serverId) },
        select: VolumesService.defaultVolumeSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "volume", []));
    res.json(volumes);
  }

  /* GET volume by id. */
  async getVolumeById(req: Request, res: Response) {
    const { id, serverId } = req.params;
    const volume = await this.prisma.volume
      .findUniqueOrThrow({
        where: { id: String(id), serverId: String(serverId) },
        select: VolumesService.defaultVolumeSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "volume", [id]));
    res.json(volume);
  }

  /* PATCH a new volume. */
  async patchVolume(req: Request, res: Response) {
    const { id, serverId } = req.params;
    const { hostPath, containerPath } = req.body;
    const volume = await this.prisma.volume
      .update({
        where: { id: String(id), serverId: String(serverId) },
        data: {
          hostPath,
          containerPath,
        },
        select: VolumesService.defaultVolumeSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "volume", [id]));
    res.json(volume);
  }

  /* DELETE an existing volume. */
  async deleteVolume(req: Request, res: Response) {
    const { id, serverId } = req.params;
    const volume = await this.prisma.volume
      .delete({
        where: { id: String(id), serverId: String(serverId) },
        select: VolumesService.defaultVolumeSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "volume", [id]));
    res.json(volume);
  }
}

export { VolumesService };
