import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { UserServerLinksService } from "../services";

class UserServerLinksController {
  static instance: UserServerLinksController;

  constructor(prisma?: PrismaClient) {
    new UserServerLinksService(prisma); // Initialize ServersService singleton.
    UserServerLinksController.instance =
      UserServerLinksController.instance ?? this;
    return UserServerLinksController.instance;
  }

  /* Get Users Linked to the Server. */
  async getUserServerLinks(req: Request, res: Response) {
    await UserServerLinksService.instance.getUserServerLinks(req, res);
  }

  /* Connect User and Server. */
  async createUserServerLinkByUserId(req: Request, res: Response) {
    await UserServerLinksService.instance.createUserServerLinkByUserId(
      req,
      res
    );
  }

  /* Disconnect User and Server. */
  async deleteUserServerLinkByUserId(req: Request, res: Response) {
    await UserServerLinksService.instance.deleteUserServerLinkByUserId(
      req,
      res
    );
  }
}

export { UserServerLinksController };
