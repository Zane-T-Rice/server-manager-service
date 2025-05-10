import * as fs from "node:fs";
import { Request, Response } from "express";
import { EnvironmentVariablesService } from "./environmentVariablesService";
import { ephemeralContainerRun } from "../utils";
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
  };

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

  /* POST restart an existing server. */
  async restartServer(req: Request, res: Response) {
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
    const commands = [
      ["docker", "restart", shellEscape([server.containerName])].join(" "),
    ];
    if (server.isInResponseChain) {
      // This service may be torn down by the restart.
      // To avoid errors, respond before executing the restart and use an exterior, ephemeral container
      // to perform the restart.
      await ephemeralContainerRun(req, res, commands, server);
    } else {
      // The operation is safe and should not require an ephemeral container. Respond after execution of commands.
      await exec(commands.join(";"));
      res.json(server);
    }
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

    // Write build files to temporary directory
    const temporaryDirectoryName = randomUUID();

    const dockerBuild: string[] = [
      `cd ${temporaryDirectoryName} &&`,
      `docker build -t ${shellEscape([server.containerName])} --no-cache`,
    ];
    server.environmentVariables.forEach((variable) => {
      dockerBuild.push(
        `--build-arg ${shellEscape([`${variable.name}=${variable.value}`])}`
      );
    });
    dockerBuild.push(".");

    const dockerRun: string[] = [
      `docker run --name=${shellEscape([server.containerName])} -d --restart always --network=server-manager-service-network`,
    ];
    server.ports.forEach((port) => {
      dockerRun.push(
        `-p ${shellEscape([`${port.number}:${port.number}/${port.protocol}`])}`
      );
    });
    server.volumes.forEach((volume) => {
      dockerRun.push(
        `-v ${shellEscape([`${volume.hostPath}:${volume.containerPath}`])}`
      );
    });
    server.environmentVariables.forEach((variable) => {
      dockerRun.push(
        `--env ${shellEscape([`${variable.name}=${variable.value}`])}`
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
          Buffer.from(file.content, "base64").toString("utf-8")
        )
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
        ServersService.defaultServerSelect
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
    const commands = [
      ["docker", "stop", shellEscape([server.containerName])].join(" "),
      ["docker", "rm", shellEscape([server.containerName])].join(" "),
    ];
    if (server.isInResponseChain) {
      // This service may be torn down by the restart.
      // To avoid errors, respond before executing the restart and use an exterior, ephemeral container
      // to perform the restart.
      await ephemeralContainerRun(req, res, commands, server);
    } else {
      // The operation is safe and should not require an ephemeral container. Respond after execution of commands.
      await exec(commands.join(";"));
      res.json(server);
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
    res.json(servers);
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
    res.json(server);
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
