import { Request, Response } from "express";
import { EnvironmentVariablesService } from "./environmentVariablesService";
import * as k8sOrchestrator from "./orchestrator/k8sOrchestrator";
import { ServerSpec } from "./orchestrator/manifests";
import { FilesService } from "./filesService";
import { handleDatabaseErrors } from "../utils/handleDatabaseErrors";
import { PortsService } from "./portsService";
import { PrismaClient } from "@prisma/client";
import { VolumesService } from "./volumesService";

class ServersService {
  static instance: ServersService;
  prisma: PrismaClient;

  static defaultServerSelect = {
    id: true,
    applicationName: true,
    containerName: true,
    isInResponseChain: true,
    isUpdatable: true,
  };

  /* Used by the updateServer route since it must generate the full workload for the cluster. */
  static completeServerSelect = {
    ...ServersService.defaultServerSelect,
    ports: {
      select: PortsService.defaultPortSelect,
    },
    volumes: {
      select: VolumesService.defaultVolumeSelect,
    },
    environmentVariables: {
      select: EnvironmentVariablesService.defaultEnvironmentVariableSelect,
    },
    files: {
      select: FilesService.defaultFileSelect,
    },
    host: {
      select: { name: true },
    },
  };

  /* The fields of a complete server that the orchestrator needs. */
  static toServerSpec(
    server: Pick<ServerSpec, "id" | "containerName" | "ports" | "volumes"> & {
      environmentVariables: ServerSpec["environmentVariables"];
      files: ServerSpec["files"];
      host: { name: string };
    },
  ): ServerSpec {
    return {
      id: server.id,
      containerName: server.containerName,
      hostName: server.host.name,
      ports: server.ports,
      volumes: server.volumes,
      environmentVariables: server.environmentVariables,
      files: server.files,
    };
  }

  constructor(prisma?: PrismaClient) {
    ServersService.instance = ServersService.instance ?? this;
    ServersService.instance.prisma =
      ServersService.instance.prisma ?? prisma ?? new PrismaClient();
    this.prisma = ServersService.instance.prisma; // Effectively initializes PrismaClient as a singleton.
    return ServersService.instance;
  }

  /* POST a new server. */
  async createServer(req: Request, res: Response) {
    const { hostId } = req.params;
    const { applicationName, containerName, isInResponseChain, isUpdatable } =
      req.body;

    const server = await this.prisma.server
      .create({
        data: {
          applicationName,
          containerName,
          isInResponseChain,
          isUpdatable,
          hostId,
        },
        select: ServersService.defaultServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", []));
    res.json(server);
  }

  /* POST update an existing server. */
  async updateServer(req: Request, res: Response) {
    const { hostId, serverId } = req.params;
    const dbServer = await this.prisma.server
      .findUniqueOrThrow({
        where: {
          id: String(serverId),
          hostId: String(hostId),
          isUpdatable: true,
        },
        select: ServersService.completeServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));

    // Makes typescript accept that server is not null.
    // Really it can never be because Prisma would throw if it
    // did not find a server above and handleDatabaseErrors is guaranteed
    // to throw.
    const server = dbServer!;

    const spec = ServersService.toServerSpec(server);
    const responseServer = (
      Object.keys(
        ServersService.defaultServerSelect,
      ) as (keyof typeof ServersService.defaultServerSelect)[]
    ).reduce((a, b) => {
      return { ...a, [b]: server[b] };
    }, {});

    await k8sOrchestrator.buildImage(spec);
    if (server.isInResponseChain) {
      // Applying the Deployment replaces this very pod, so respond first.
      req.log.flush();
      res.json(responseServer);
      await k8sOrchestrator.applyServer(spec);
    } else {
      await k8sOrchestrator.applyServer(spec);
      res.json(responseServer);
    }
  }

  /* POST stop an existing server. */
  async stopServer(req: Request, res: Response) {
    const { hostId, serverId } = req.params;
    const dbServer = await this.prisma.server
      .findUniqueOrThrow({
        where: { id: String(serverId), hostId: String(hostId) },
        select: ServersService.defaultServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));
    // Makes typescript accept that server is not null.
    // Really it can never be because Prisma would throw if it
    // did not find a server above and handleDatabaseErrors is guaranteed
    // to throw.
    const server = dbServer!;
    if (server.isInResponseChain) {
      // Removing the Deployment tears this pod down, so respond first.
      req.log.flush();
      res.json(server);
      await k8sOrchestrator.removeServer(server);
    } else {
      await k8sOrchestrator.removeServer(server);
      res.json(server);
    }
  }

  /* Status of every server in the cluster, keyed by server id. Undefined if the cluster could not be asked. */
  async getContainerStatuses(): Promise<Map<string, string> | undefined> {
    return k8sOrchestrator.getStatuses();
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

  /* GET all servers. */
  async getServers(req: Request, res: Response) {
    const { hostId } = req.params;
    const { isUpdatable: isUpdatableQuery } = req.query;
    const isUpdatable = this.stringToBoolean(isUpdatableQuery as string);
    const query = {
      select: ServersService.defaultServerSelect,
      where: { hostId: String(hostId), isUpdatable },
    };
    const servers = await this.prisma.server
      .findMany(query)
      .catch((e) => handleDatabaseErrors(e, "server", []));
    // A workload only exists while the server is started (stopping removes it).
    // The status is "unknown" if the cluster could not be asked.
    const statuses = await this.getContainerStatuses();
    res.json(
      servers.map((server) => ({
        ...server,
        status: statuses ? (statuses.get(server.id) ?? "stopped") : "unknown",
      })),
    );
  }

  /* GET server by id. */
  async getServerById(req: Request, res: Response) {
    const { hostId, serverId } = req.params;
    const server = await this.prisma.server
      .findUniqueOrThrow({
        where: { id: String(serverId), hostId: String(hostId) },
        select: ServersService.defaultServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));
    const statuses = await this.getContainerStatuses();
    res.json({
      ...server,
      status: statuses ? (statuses.get(server.id) ?? "stopped") : "unknown",
    });
  }

  /* PATCH an existing server. */
  async patchServer(req: Request, res: Response) {
    const { hostId, serverId } = req.params;
    const { applicationName, containerName, isInResponseChain, isUpdatable } =
      req.body;

    const server = await this.prisma.server
      .update({
        where: { id: String(serverId), hostId: String(hostId) },
        data: {
          applicationName,
          containerName,
          isInResponseChain,
          isUpdatable,
          hostId,
        },
        select: ServersService.defaultServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));
    res.json(server);
  }

  /* DELETE an existing server. */
  async deleteServer(req: Request, res: Response) {
    const { hostId, serverId } = req.params;
    const server = await this.prisma.server
      .delete({
        where: {
          id: String(serverId),
          hostId: String(hostId),
        },
        select: ServersService.defaultServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [serverId]));
    res.json(server);
  }
}

export { ServersService };
