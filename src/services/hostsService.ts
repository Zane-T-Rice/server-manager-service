import { Request, Response } from "express";
import { handleDatabaseErrors } from "../utils/handleDatabaseErrors";
import { PrismaClient } from "@prisma/client";

class HostsService {
  static instance: HostsService;
  prisma: PrismaClient;

  static defaultHostSelect = {
    id: true,
    name: true,
    url: true,
  };

  constructor(prisma?: PrismaClient) {
    HostsService.instance = HostsService.instance ?? this;
    HostsService.instance.prisma =
      HostsService.instance.prisma ?? prisma ?? new PrismaClient();
    this.prisma = HostsService.instance.prisma; // Effectively initializes PrismaClient as a singleton.
    return HostsService.instance;
  }

  /* POST a new host. */
  async createHost(req: Request, res: Response) {
    const { name, url } = req.body;
    const host = await this.prisma.host
      .create({
        data: {
          url,
          name,
        },
        select: HostsService.defaultHostSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "host", []));
    res.json(host);
  }

  /* GET all host. */
  async getHosts(req: Request, res: Response) {
    const hosts = await this.prisma.host
      .findMany({
        select: HostsService.defaultHostSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "host", []));
    res.json(hosts);
  }

  /* GET host by id. */
  async getHostById(req: Request, res: Response) {
    const { hostId } = req.params;
    const host = await this.prisma.host
      .findUniqueOrThrow({
        where: { id: String(hostId) },
        select: HostsService.defaultHostSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "host", [hostId]));
    res.json(host);
  }

  /* PATCH an existing host. */
  async patchHost(req: Request, res: Response) {
    const { hostId } = req.params;
    const { name, url } = req.body;
    const host = await this.prisma.host
      .update({
        where: { id: String(hostId) },
        data: {
          name,
          url,
        },
        select: HostsService.defaultHostSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "host", [hostId]));
    res.json(host);
  }

  /* DELETE an existing host. */
  async deleteHost(req: Request, res: Response) {
    const { hostId } = req.params;
    const host = await this.prisma.host
      .delete({
        where: { id: String(hostId) },
        select: HostsService.defaultHostSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "host", [hostId]));
    res.json(host);
  }
}

export { HostsService };
