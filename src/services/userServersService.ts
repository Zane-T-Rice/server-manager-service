import { Request, Response } from "express";
import { handleDatabaseErrors } from "../utils/handleDatabaseErrors";
import { PrismaClient } from "@prisma/client";
import { ServersService } from "./serversService";
import { BadRequestError } from "../errors";
import { formatMessage } from "../utils";
import { ErrorMessages } from "../constants";

class UserServersService {
  static instance: UserServersService;
  prisma: PrismaClient;

  static defaultServerSelect = {
    applicationName: true,
    containerName: true,
    id: true,
    isUpdatable: true,
    ports: {
      select: { number: true },
    },
    host: {
      select: { url: true },
    },
  };

  constructor(prisma?: PrismaClient) {
    new ServersService(prisma); // Initialize ServersService singleton.
    UserServersService.instance = UserServersService.instance ?? this;
    UserServersService.instance.prisma =
      UserServersService.instance.prisma ?? prisma ?? new PrismaClient();
    this.prisma = UserServersService.instance.prisma; // Effectively initializes PrismaClient as a singleton.
    return UserServersService.instance;
  }

  /* POST restart an existing server owned by this user. */
  async restartServer(req: Request, res: Response) {
    const { serverId } = req.params;
    const server = await this.prisma.server
      .findUniqueOrThrow({
        where: {
          id: String(serverId),
          users: {
            some: {
              username: String(req.auth?.payload.sub),
            },
          },
        },
        select: { hostId: true },
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));
    req.params.hostId = server.hostId;
    await ServersService.instance.restartServer(req, res);
  }

  /* POST update an existing server owned by this user. */
  async updateServer(req: Request, res: Response) {
    const { serverId } = req.params;
    const server = await this.prisma.server
      .findUniqueOrThrow({
        where: {
          id: String(serverId),
          users: {
            some: {
              username: String(req.auth?.payload.sub),
            },
          },
        },
        select: { hostId: true },
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));
    req.params.hostId = server.hostId;
    await ServersService.instance.updateServer(req, res);
  }

  /* POST stop an existing server owned by this user. */
  async stopServer(req: Request, res: Response) {
    const { serverId } = req.params;
    const server = await this.prisma.server
      .findUniqueOrThrow({
        where: {
          id: String(serverId),
          users: {
            some: {
              username: String(req.auth?.payload.sub),
            },
          },
        },
        select: { hostId: true },
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));
    req.params.hostId = server.hostId;
    await ServersService.instance.stopServer(req, res);
  }

  stringToBoolean(value: string | undefined | null): boolean | undefined {
    let result;
    if (value === undefined || value == null) {
      result = undefined;
    } else if (value.toLowerCase() === "true") {
      result = true;
    } else if (value.toLowerCase() === "false") {
      result = false;
    } else {
      result = undefined;
    }
    return result;
  }

  /* GET all servers available to this user. */
  async getServers(req: Request, res: Response) {
    const { isUpdatable: isUpdatableQuery } = req.query;
    const isUpdatable = this.stringToBoolean(isUpdatableQuery as string);
    const servers = await this.prisma.server
      .findMany({
        select: UserServersService.defaultServerSelect,
        where: {
          isUpdatable,
          users: {
            some: {
              username: String(req.auth?.payload.sub),
            },
          },
        },
      })
      .catch((e) => handleDatabaseErrors(e, "server", []));
    res.json(servers);
  }

  /* GET server owned by this user by id. */
  async getServerById(req: Request, res: Response) {
    const { serverId } = req.params;
    const server = await this.prisma.server
      .findUniqueOrThrow({
        where: {
          id: String(serverId),
          users: {
            some: {
              username: String(req.auth?.payload.sub),
            },
          },
        },
        select: UserServersService.defaultServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));
    res.json(server);
  }

  /* DELETE an existing server owned by _only_ this user. */
  async deleteServer(req: Request, res: Response) {
    const { serverId } = req.params;
    const usersOfServer = await this.prisma.user.findMany({
      where: {
        servers: {
          some: {
            id: String(serverId),
          },
        },
      },
    });
    if (usersOfServer.length > 1)
      throw new BadRequestError(
        formatMessage(ErrorMessages.serverOwnedByMultipleUsers, { serverId })
      );
    const server = await this.prisma.server
      .delete({
        where: {
          id: String(serverId),
          users: {
            every: {
              username: String(req.auth?.payload.sub),
            },
          },
        },
        select: UserServersService.defaultServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));
    res.json(server);
  }
}

export { UserServersService };
