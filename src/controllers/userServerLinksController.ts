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

  /* PATCH a link betwen User and Server of request. */
  async patchUserServerLinkByUserId(req: Request, res: Response) {
    await UserServerLinksService.instance.patchUserServerLinkByUserId(req, res);
  }

  /* DELETE a link betwen User and Server of request. */
  async deleteUserServerLinkByUserId(req: Request, res: Response) {
    await UserServerLinksService.instance.deleteUserServerLinkByUserId(
      req,
      res
    );
  }
}

export { UserServerLinksController };
