import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { HostsService } from "../services";

class HostsController {
  static instance: HostsController;

  constructor(prisma?: PrismaClient) {
    new HostsService(prisma); // Initialize HostsService singleton.
    HostsController.instance = HostsController.instance ?? this;
    return HostsController.instance;
  }

  /* POST a new host. */
  async createHost(req: Request, res: Response) {
    await HostsService.instance.createHost(req, res);
  }

  /* GET all hosts. */
  async getHosts(req: Request, res: Response) {
    await HostsService.instance.getHosts(req, res);
  }

  /* GET host by id. */
  async getHostById(req: Request, res: Response) {
    await HostsService.instance.getHostById(req, res);
  }

  /* PATCH an existing host. */
  async patchHost(req: Request, res: Response) {
    await HostsService.instance.patchHost(req, res);
  }

  /* DELETE an existing host. */
  async deleteHost(req: Request, res: Response) {
    await HostsService.instance.deleteHost(req, res);
  }
}

export { HostsController };
