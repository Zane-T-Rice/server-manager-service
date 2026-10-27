import { Request, Response } from "express";
import { handleDatabaseErrors } from "../utils/handleDatabaseErrors";
import { PrismaClient } from "@prisma/client";
import { ServersService } from "./serversService";
import { BadRequestError } from "../errors";
import { formatMessage } from "../utils";
import { ErrorMessages, Routes } from "../constants";

// Do not wait forever on a host that does not answer.
const HOST_STATUS_TIMEOUT_MS = 3000;

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

  /* POST update an existing server owned by this user. */
  async updateServer(req: Request, res: Response) {
    const { serverId } = req.params;
    const server = await this.prisma.server
      .findUniqueOrThrow({
        where: {
          id: String(serverId),
          users: {
            some: {
              userId: String(req.auth?.payload.sub),
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
              userId: String(req.auth?.payload.sub),
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

  /* The status of the containers of a host other than this one, as reported by that host. */
  async getRemoteStatuses(
    req: Request,
    hostUrl: string,
  ): Promise<Map<string, string>> {
    const statuses = new Map<string, string>();
    try {
      const url = new URL(hostUrl);
      const path = url.pathname.replace(/\/$/, "");
      // The proxy prefix makes the host answer for itself instead of asking the other hosts in turn.
      const response = await fetch(
        `${url.origin}${path}${Routes.PROXY}/users/servers`,
        {
          headers: { authorization: String(req.headers.authorization) },
          signal: AbortSignal.timeout(HOST_STATUS_TIMEOUT_MS),
        },
      );
      if (response.ok) {
        const servers = (await response.json()) as {
          id: string;
          status?: string;
        }[];
        servers.forEach((server) => {
          if (server.status) statuses.set(server.id, server.status);
        });
      }
    } catch {
      // The statuses of this host stay unknown.
    }
    return statuses;
  }

  /* The status of each server by id: from docker here, or from the host that runs the server. */
  async getStatuses(
    req: Request,
    servers: { id: string; containerName: string; host: { url: string } }[],
  ): Promise<Map<string, string>> {
    const isLocal = (server: { host: { url: string } }) =>
      server.host.url === process.env.HOST;
    const statuses = new Map<string, string>();

    // A proxied request is only asking for this host's own servers.
    const remoteHostUrls = req.originalUrl?.startsWith(Routes.PROXY)
      ? []
      : Array.from(
          new Set(servers.filter((s) => !isLocal(s)).map((s) => s.host.url)),
        );
    const [containers, ...remoteStatuses] = await Promise.all([
      servers.some(isLocal)
        ? ServersService.instance.getContainerStatuses()
        : undefined,
      ...remoteHostUrls.map((url) => this.getRemoteStatuses(req, url)),
    ]);

    servers.filter(isLocal).forEach((server) => {
      statuses.set(
        server.id,
        containers
          ? (containers.get(server.containerName) ?? "stopped")
          : "unknown",
      );
    });
    remoteHostUrls.forEach((hostUrl, index) => {
      servers
        .filter((server) => server.host.url === hostUrl)
        .forEach((server) => {
          statuses.set(
            server.id,
            remoteStatuses[index].get(server.id) ?? "unknown",
          );
        });
    });
    return statuses;
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
              userId: String(req.auth?.payload.sub),
            },
          },
        },
      })
      .catch((e) => handleDatabaseErrors(e, "server", []));
    const statuses = await this.getStatuses(req, servers);
    res.json(
      servers.map((server) => ({
        ...server,
        status: statuses.get(server.id) ?? "unknown",
      })),
    );
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
              userId: String(req.auth?.payload.sub),
            },
          },
        },
        select: UserServersService.defaultServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));
    // This request is proxied to the host of the server, so docker here is the right one to ask.
    const statuses = await ServersService.instance.getContainerStatuses();
    res.json({
      ...server,
      status: statuses
        ? (statuses.get(server.containerName) ?? "stopped")
        : "unknown",
    });
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
        formatMessage(ErrorMessages.serverOwnedByMultipleUsers, { serverId }),
      );
    const server = await this.prisma.server
      .delete({
        where: {
          id: String(serverId),
          users: {
            every: {
              userId: String(req.auth?.payload.sub),
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
