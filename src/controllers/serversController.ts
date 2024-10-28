import { Request, Response } from "express";
import { ServersService } from "../services";
import { PrismaClient } from "@prisma/client";

class ServersController {
  serversService: ServersService;

  constructor(prisma?: PrismaClient) {
    this.serversService = new ServersService(prisma ?? new PrismaClient());
  }

  /* POST a new server. */
  async createServer(req: Request, res: Response) {
    await this.serversService.createServer(req, res);
  }

  /* POST restart an existing server. */
  async restartServer(req: Request, res: Response) {
    await this.serversService.restartServer(req, res);
  }

  /* GET all servers. */
  async getServers(req: Request, res: Response) {
    await this.serversService.getServers(req, res);
  }

  /* GET server by id. */
  async getServerById(req: Request, res: Response) {
    await this.serversService.getServerById(req, res);
  }

  /* PATCH a new server. */
  async patchServer(req: Request, res: Response) {
    await this.serversService.patchServer(req, res);
  }

  /* DELETE an existing server. */
  async deleteServer(req: Request, res: Response) {
    await this.serversService.deleteServer(req, res);
  }
}

export { ServersController };
