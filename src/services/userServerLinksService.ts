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
  listAuth0Users,
  searchAuth0ClientsByName,
  searchAuth0UsersByEmail,
} from "../utils/auth0ManagementClient";

class UserServerLinksService {
  static instance: UserServerLinksService;
  prisma: PrismaClient;

  static allUsersPageSize = 50;

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

  /* Search Auth0 for users and machine-to-machine applications to link.
   * Users are found by their email, machines by their name.
   * With all=true, instead list every user (a page at a time, see page) and,
   * on the first page, every machine. For when emails are not predictable. */
  async searchAuth0Users(req: Request, res: Response) {
    const text = String(req.query.email ?? "");
    let users: Awaited<ReturnType<typeof searchAuth0UsersByEmail>> = [];
    let clients: Awaited<ReturnType<typeof searchAuth0ClientsByName>> = [];
    if (req.query.all === "true") {
      const page = Math.max(parseInt(String(req.query.page ?? "0")) || 0, 0);
      [users, clients] = await Promise.all([
        listAuth0Users(page, UserServerLinksService.allUsersPageSize),
        page === 0 ? searchAuth0ClientsByName("", 100) : [],
      ]);
    } else if (text) {
      [users, clients] = await Promise.all([
        searchAuth0UsersByEmail(text),
        searchAuth0ClientsByName(text),
      ]);
    }
    res.json([
      ...users.map((user) => ({
        userId: user.user_id,
        email: user.email,
        type: "user",
      })),
      ...clients.map((client) => ({
        userId: `${client.client_id}${CLIENT_SUB_SUFFIX}`,
        applicationName: client.name,
        type: "machine",
      })),
    ]);
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
