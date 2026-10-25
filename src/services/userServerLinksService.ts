import { Request, Response } from "express";
import { handleDatabaseErrors } from "../utils/handleDatabaseErrors";
import { PrismaClient } from "@prisma/client";
import { BadRequestError } from "../errors";
import { ErrorMessages } from "../constants";
import { formatMessage } from "../utils/formatMessage";
import {
  CLIENT_SUB_SUFFIX,
  getAuth0ClientById,
  getAuth0UserById,
} from "../utils/auth0ManagementClient";

class UserServerLinksService {
  static instance: UserServerLinksService;
  prisma: PrismaClient;

  static defaultUserServerLinkSelect = {
    id: true,
    userId: true,
    email: true,
    applicationName: true,
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
    const { userId } = req.body;
    await this.prisma.server
      .findUniqueOrThrow({
        where: {
          id: String(serverId),
          hostId: String(hostId),
        },
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));

    // Auth0 is the source of truth for the user's email (or the machine's
    // application name), so look it up rather than trust the client.
    if (!userId) {
      throw new BadRequestError(
        formatMessage(ErrorMessages.theArgumentIsRequired, {
          argument: "userId",
        }),
      );
    }
    // Machine-to-machine applications are identified as <client_id>@clients.
    const identity = String(userId).endsWith(CLIENT_SUB_SUFFIX)
      ? {
          email: null,
          applicationName: (
            await getAuth0ClientById(
              String(userId).slice(0, -CLIENT_SUB_SUFFIX.length),
            )
          ).name,
        }
      : {
          email: (await getAuth0UserById(String(userId))).email ?? null,
          applicationName: null,
        };

    // If a user does not exist, create it.
    // Connect the user to the server with id serverId.
    const user = await this.prisma.user
      .upsert({
        where: { userId: String(userId) },
        select: UserServerLinksService.defaultUserServerLinkSelect,
        create: {
          userId: String(userId),
          ...identity,
          servers: {
            connect: {
              id: String(serverId),
            },
          },
        },
        update: {
          ...identity,
          servers: {
            connect: {
              id: String(serverId),
            },
          },
        },
      })
      .catch((e) => handleDatabaseErrors(e, "userServerLink", [userId]));
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
