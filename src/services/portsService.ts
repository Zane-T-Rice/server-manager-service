import { Request, Response } from "express";
import { handleDatabaseErrors } from "../utils/handleDatabaseErrors";
import { PrismaClient } from "@prisma/client";

class PortsService {
  static instance: PortsService;
  prisma: PrismaClient;

  static defaultPortSelect = {
    id: true,
    number: true,
    protocol: true,
  };

  constructor(prisma?: PrismaClient) {
    PortsService.instance = PortsService.instance ?? this;
    PortsService.instance.prisma =
      PortsService.instance.prisma ?? prisma ?? new PrismaClient();
    this.prisma = PortsService.instance.prisma; // Effectively initializes PrismaClient as a singleton.
    return PortsService.instance;
  }

  /* POST a new port. */
  async createPort(req: Request, res: Response) {
    const { serverId } = req.params;
    const { number, protocol } = req.body;
    const port = await this.prisma.port
      .create({
        data: {
          serverId,
          number,
          protocol,
        },
        select: PortsService.defaultPortSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "port", []));
    res.json(port);
  }

  /* GET all ports. */
  async getPorts(req: Request, res: Response) {
    const { hostId, serverId } = req.params;
    const ports = await this.prisma.port
      .findMany({
        where: { server: { id: String(serverId), hostId: String(hostId) } },
        select: PortsService.defaultPortSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "port", []));
    res.json(ports);
  }

  /* GET port by id. */
  async getPortById(req: Request, res: Response) {
    const { hostId, serverId, portId } = req.params;
    const port = await this.prisma.port
      .findUniqueOrThrow({
        where: {
          id: String(portId),
          server: { id: String(serverId), hostId: String(hostId) },
        },
        select: PortsService.defaultPortSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "port", [portId]));
    res.json(port);
  }

  /* PATCH an existing port. */
  async patchPort(req: Request, res: Response) {
    const { hostId, serverId, portId } = req.params;
    const { number, protocol } = req.body;
    const port = await this.prisma.port
      .update({
        where: {
          id: String(portId),
          server: { id: String(serverId), hostId: String(hostId) },
        },
        data: {
          number,
          protocol,
        },
        select: PortsService.defaultPortSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "port", [portId]));
    res.json(port);
  }

  /* DELETE an existing port. */
  async deletePort(req: Request, res: Response) {
    const { hostId, serverId, portId } = req.params;
    const port = await this.prisma.port
      .delete({
        where: {
          id: String(portId),
          server: { id: String(serverId), hostId: String(hostId) },
        },
        select: PortsService.defaultPortSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "port", [portId]));
    res.json(port);
  }
}

export { PortsService };
