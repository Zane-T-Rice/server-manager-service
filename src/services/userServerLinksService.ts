import { Request, Response } from "express";
import { handleDatabaseErrors } from "../utils/handleDatabaseErrors";
import { PrismaClient } from "@prisma/client";

class UserServerLinksService {
  static instance: UserServerLinksService;
  prisma: PrismaClient;

  static defaultUserServerLinkSelect = {
    id: true,
  };

  constructor(prisma?: PrismaClient) {
    UserServerLinksService.instance = UserServerLinksService.instance ?? this;
    UserServerLinksService.instance.prisma =
      UserServerLinksService.instance.prisma ?? prisma ?? new PrismaClient();
    this.prisma = UserServerLinksService.instance.prisma; // Effectively initializes PrismaClient as a singleton.
    return UserServerLinksService.instance;
  }

  /* PATCH a link betwen User and Server of request by userId. */
  async patchUserServerLinkByUserId(req: Request, res: Response) {
    const { hostId, serverId, userId } = req.params;
    await this.prisma.server
      .findUniqueOrThrow({
        where: {
          id: String(serverId),
          hostId: String(hostId),
        },
        select: UserServerLinksService.defaultUserServerLinkSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));

    // If a user does not exist, create it.
    // Connect the user to the server with id serverId.
    await this.prisma.user.upsert({
      where: { id: String(userId) },
      create: {
        id: String(userId),
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
    });
    res.json({ userId, serverId });
  }

  /* DELETE a link betwen User and Server of request by userId. */
  async deleteUserServerLinkByUserId(req: Request, res: Response) {
    const { hostId, serverId, userId } = req.params;
    await this.prisma.server
      .findUniqueOrThrow({
        where: {
          id: String(serverId),
          hostId: String(hostId),
        },
        select: UserServerLinksService.defaultUserServerLinkSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));

    await this.prisma.user
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
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));
    res.json({ userId, serverId });
  }
}

export { UserServerLinksService };
