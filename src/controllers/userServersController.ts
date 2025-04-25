import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { UserServersService } from "../services";

class UserServersController {
  static instance: UserServersController;

  constructor(prisma?: PrismaClient) {
    new UserServersService(prisma); // Initialize UserServersService singleton.
    UserServersController.instance = UserServersController.instance ?? this;
    return UserServersController.instance;
  }

  /* POST restart an existing server. */
  async restartServer(req: Request, res: Response) {
    await UserServersService.instance.restartServer(req, res);
  }

  /* POST update an existing server. */
  async updateServer(req: Request, res: Response) {
    await UserServersService.instance.updateServer(req, res);
  }

  /* POST stop an existing server. */
  async stopServer(req: Request, res: Response) {
    await UserServersService.instance.stopServer(req, res);
  }

  /* GET all servers. */
  async getServers(req: Request, res: Response) {
    await UserServersService.instance.getServers(req, res);
  }

  /* GET server by id. */
  async getServerById(req: Request, res: Response) {
    await UserServersService.instance.getServerById(req, res);
  }

  /* DELETE an existing server. */
  async deleteServer(req: Request, res: Response) {
    await UserServersService.instance.deleteServer(req, res);
  }
}

export { UserServersController };
