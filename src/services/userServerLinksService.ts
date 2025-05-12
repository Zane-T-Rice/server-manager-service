import { Request, Response } from "express";
import { handleDatabaseErrors } from "../utils/handleDatabaseErrors";
import { PrismaClient } from "@prisma/client";

class UserServerLinksService {
  static instance: UserServerLinksService;
  prisma: PrismaClient;

  static defaultUserServerLinkSelect = {
    id: true,
    username: true,
  };

  constructor(prisma?: PrismaClient) {
    UserServerLinksService.instance = UserServerLinksService.instance ?? this;
    UserServerLinksService.instance.prisma =
      UserServerLinksService.instance.prisma ?? prisma ?? new PrismaClient();
    this.prisma = UserServerLinksService.instance.prisma; // Effectively initializes PrismaClient as a singleton.
    return UserServerLinksService.instance;
  }

  /* Get Users Linked to the Server. */
  async getUserServerLinks(req: Request, res: Response) {
    const { hostId, serverId } = req.params;
    await this.prisma.server
      .findUniqueOrThrow({
        where: {
          id: String(serverId),
          hostId: String(hostId),
        },
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));

    // Get all the Users for the given Server.
    const users = await this.prisma.user
      .findMany({
        where: {
          servers: {
            some: {
              id: String(serverId),
              hostId: String(hostId),
            },
          },
        },
        select: UserServerLinksService.defaultUserServerLinkSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "userServerLink", []));
    res.json(users);
  }

  /* Connect User and Server. */
  async createUserServerLinkByUserId(req: Request, res: Response) {
    const { hostId, serverId } = req.params;
    const { username } = req.body;
    await this.prisma.server
      .findUniqueOrThrow({
        where: {
          id: String(serverId),
          hostId: String(hostId),
        },
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));

    // If a user does not exist, create it.
    // Connect the user to the server with id serverId.
    const user = await this.prisma.user
      .upsert({
        where: { username: String(username) },
        create: {
          username: String(username),
          servers: {
            connect: {
              id: String(serverId),
            },
          },
        },
        update: {
          servers: {
            connect: {
              id: String(serverId),
            },
          },
        },
      })
      .catch((e) => handleDatabaseErrors(e, "userServerLink", [username]));
    res.json(user);
  }

  /* Disconnect User and Server. */
  async deleteUserServerLinkByUserId(req: Request, res: Response) {
    const { hostId, serverId, userId } = req.params;
    await this.prisma.server
      .findUniqueOrThrow({
        where: {
          id: String(serverId),
          hostId: String(hostId),
        },
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));

    const user = await this.prisma.user
      .update({
        where: { id: String(userId) },
        data: {
          servers: {
            disconnect: {
              id: String(serverId),
            },
          },
        },
      })
      .catch((e) => handleDatabaseErrors(e, "userServerLink", [userId]));
    res.json(user);
  }
}

export { UserServerLinksService };
