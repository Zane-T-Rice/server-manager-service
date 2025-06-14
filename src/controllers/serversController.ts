import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ServersService } from "../services";

class ServersController {
  static instance: ServersController;

  constructor(prisma?: PrismaClient) {
    new ServersService(prisma); // Initialize ServersService singleton.
    ServersController.instance = ServersController.instance ?? this;
    return ServersController.instance;
  }

  /* POST a new server. */
  async createServer(req: Request, res: Response) {
    await ServersService.instance.createServer(req, res);
  }

  /* POST update an existing server. */
  async updateServer(req: Request, res: Response) {
    await ServersService.instance.updateServer(req, res);
  }

  /* POST stop an existing server. */
  async stopServer(req: Request, res: Response) {
    await ServersService.instance.stopServer(req, res);
  }

  /* GET all servers. */
  async getServers(req: Request, res: Response) {
    await ServersService.instance.getServers(req, res);
  }

  /* GET server by id. */
  async getServerById(req: Request, res: Response) {
    await ServersService.instance.getServerById(req, res);
  }

  /* PATCH an existing server. */
  async patchServer(req: Request, res: Response) {
    await ServersService.instance.patchServer(req, res);
  }

  /* DELETE an existing server. */
  async deleteServer(req: Request, res: Response) {
    await ServersService.instance.deleteServer(req, res);
  }
}

export { ServersController };
