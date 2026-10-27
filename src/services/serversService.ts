import * as fs from "node:fs";
import { Request, Response } from "express";
import { EnvironmentVariablesService } from "./environmentVariablesService";
import { ephemeralContainerRun } from "../utils";
import * as k8sOrchestrator from "./orchestrator/k8sOrchestrator";
import { ServerSpec } from "./orchestrator/manifests";
import { exec as exec2 } from "child_process";
import { FilesService } from "./filesService";
import { handleDatabaseErrors } from "../utils/handleDatabaseErrors";
import path from "node:path";
import { PortsService } from "./portsService";
import { PrismaClient } from "@prisma/client";
import { promisify } from "util";
import { randomUUID } from "crypto";
import shellEscape from "shell-escape";
import { VolumesService } from "./volumesService";
const exec = promisify(exec2);

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

  /* Used by the updateServer route since it must generate full commands to docker. */
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

  /* True when servers run on Kubernetes instead of through the docker CLI. */
  static useK8s() {
    return process.env.ORCHESTRATOR === "k8s";
  }

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

    if (ServersService.useK8s()) {
      return this.updateServerK8s(req, res, server);
    }

    // Write build files to temporary directory
    const temporaryDirectoryName = randomUUID();

    const dockerBuild: string[] = [
      `cd ${temporaryDirectoryName} &&`,
      `docker build -t ${shellEscape([server.containerName])} --no-cache`,
    ];
    server.environmentVariables.forEach((variable) => {
      dockerBuild.push(
        `--build-arg ${shellEscape([`${variable.name}=${variable.value}`])}`,
      );
    });
    dockerBuild.push(".");

    const dockerRun: string[] = [
      `docker run --name=${shellEscape([server.containerName])} -d --restart always --network=server-manager-service-network`,
    ];
    server.ports.forEach((port) => {
      dockerRun.push(
        `-p ${shellEscape([`${port.number}:${port.number}/${port.protocol}`])}`,
      );
    });
    server.volumes.forEach((volume) => {
      dockerRun.push(
        `--mount ${shellEscape([`type=bind,src=${volume.hostPath},dst=${volume.containerPath}`])}`,
      );
    });
    server.environmentVariables.forEach((variable) => {
      dockerRun.push(
        `--env ${shellEscape([`${variable.name}=${variable.value}`])}`,
      );
    });
    dockerRun.push(shellEscape([server.containerName]));

    try {
      // Write out the Dockerfile and any other files this server has configured
      // to a temporary working directory.
      await exec(`mkdir ${temporaryDirectoryName}`);
      server.files.forEach((file) =>
        fs.writeFileSync(
          path.join(`${temporaryDirectoryName}`, path.basename(file.name)),
          Buffer.from(file.content, "base64").toString("utf-8"),
        ),
      );

      // Build new image
      await exec(dockerBuild.join(" "));
    } finally {
      // Cleanup temporary directory
      await exec(`rm -rf ${temporaryDirectoryName}`);
    }

    const commands = [
      `docker pull alpine:latest`,
      `docker stop ${shellEscape([server.containerName])}`,
      `docker rm ${shellEscape([server.containerName])}`,
      dockerRun.join(" "),
    ];

    const responseServer = (
      Object.keys(
        ServersService.defaultServerSelect,
      ) as (keyof typeof ServersService.defaultServerSelect)[]
    ).reduce((a, b) => {
      return { ...a, [b]: server[b] };
    }, {});
    if (server.isInResponseChain) {
      // This service may be torn down by the update.
      // To avoid errors, respond before executing the update and use an exterior, ephemeral container
      // to perform the update.
      await ephemeralContainerRun(req, res, commands, responseServer);
    } else {
      // The operation is safe and should not require an ephemeral container. Respond after execution of commands.
      await exec(commands.join(";"));
      res.json(responseServer);
    }
  }

  /* Update a server on Kubernetes: build the image in a job, then roll out the Deployment. */
  private async updateServerK8s(
    req: Request,
    res: Response,
    server: Parameters<typeof ServersService.toServerSpec>[0] & {
      isInResponseChain: boolean;
    },
  ) {
    const spec = ServersService.toServerSpec(server);
    const responseServer = (
      Object.keys(
        ServersService.defaultServerSelect,
      ) as (keyof typeof ServersService.defaultServerSelect)[]
    ).reduce((a, b) => {
      return { ...a, [b]: server[b as keyof typeof server] };
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
    if (ServersService.useK8s()) {
      if (server.isInResponseChain) {
        // Removing the Deployment tears this pod down, so respond first.
        req.log.flush();
        res.json(server);
        await k8sOrchestrator.removeServer(server);
      } else {
        await k8sOrchestrator.removeServer(server);
        res.json(server);
      }
      return;
    }
    const commands = [
      [
        `(`,
        // Stop and remove the container if it exists.
        `docker container inspect ${shellEscape([server.containerName])} &&`,
        `docker stop ${shellEscape([server.containerName])} &&`,
        `docker rm ${shellEscape([server.containerName])}`,
        `) || true`, // Return success if the container does not exist.
      ].join(" "),
    ];
    if (server.isInResponseChain) {
      // This service may be torn down by the stop.
      // To avoid errors, respond before executing the stop and use an exterior, ephemeral container
      // to perform the stop.
      await ephemeralContainerRun(req, res, commands, server);
    } else {
      // The operation is safe and should not require an ephemeral container. Respond after execution of commands.
      await exec(commands.join(";"));
      res.json(server);
    }
  }

  /* Status of every container on this host, keyed by container name. */
  async getContainerStatuses(): Promise<Map<string, string> | undefined> {
    if (ServersService.useK8s()) {
      return k8sOrchestrator.getStatuses();
    }
    try {
      const { stdout } = await exec(
        `docker ps --all --format '{{.Names}}|{{.State}}'`,
      );
      return new Map(
        String(stdout)
          .split("\n")
          .filter((line) => line.includes("|"))
          .map((line) => line.split("|") as [string, string]),
      );
    } catch {
      return undefined;
    }
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
    // A container only exists while the server is started (stopping removes it).
    // The status is "unknown" if docker could not be asked.
    // A host that could not be reached has no statuses to report from here.
    const statuses = res.locals?.hostUnreachable
      ? undefined
      : await this.getContainerStatuses();
    res.json(
      servers.map((server) => ({
        ...server,
        status: statuses
          ? (statuses.get(server.containerName) ?? "stopped")
          : "unknown",
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
    // This request is proxied to the host of the server, so docker here is the right one to ask.
    const statuses = await this.getContainerStatuses();
    res.json({
      ...server,
      status: statuses
        ? (statuses.get(server.containerName) ?? "stopped")
        : "unknown",
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
