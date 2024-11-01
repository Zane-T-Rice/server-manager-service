import * as fs from "node:fs";
import { Request, Response } from "express";
import { EnvironmentVariablesService } from "./environmentVariablesService";
import { exec as exec2 } from "child_process";
import { FilesService } from "./filesService";
import { handleDatabaseErrors } from "../utils/handleDatabaseErrors";
import path from "node:path";
import { PortsService } from "./portsService";
import { PrismaClient } from "@prisma/client";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { VolumesService } from "./volumesService";
const exec = promisify(exec2);

class ServersService {
  static instance: ServersService;
  prisma: PrismaClient;

  static defaultServerSelect = {
    id: true,
    applicationName: true,
    containerName: true,
    isUpdatable: true,
  };

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
    const { applicationName, containerName, isUpdatable } = req.body;
    const server = await this.prisma.server
      .create({
        data: {
          applicationName,
          containerName,
          isUpdatable,
        },
        select: ServersService.defaultServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", []));
    res.json(server);
  }

  /* POST restart an existing server. */
  async restartServer(req: Request, res: Response) {
    const { id } = req.params;
    const server = await this.prisma.server
      .findUniqueOrThrow({
        where: { id: String(id) },
        select: ServersService.defaultServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [id]));
    await exec(`sudo docker restart '${server?.containerName}'`);
    res.json(server);
  }

  /* POST update an existing server. */
  async updateServer(req: Request, res: Response) {
    const { id } = req.params;
    const dbServer = await this.prisma.server
      .findUniqueOrThrow({
        where: { id: String(id), isUpdatable: true },
        select: ServersService.completeServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [id]));

    // Makes typescript accept that server is not null.
    // Really it can never be because Prisma would throw if it
    // did not find a server above and handleDatabaseErrors is guaranteed
    // to throw.
    const server = dbServer!;

    // Write build files to temporary directory
    const temporaryDirectoryName = randomUUID();

    const dockerBuild: string[] = [
      `cd ${temporaryDirectoryName} &&`,
      `sudo docker build -t ${server.containerName} --no-cache`,
    ];
    server.environmentVariables.forEach((variable) => {
      dockerBuild.push(`--build-arg ${variable.name}=${variable.value}`);
    });
    dockerBuild.push(".");

    const dockerRun: string[] = [
      `sudo docker run --name=${server.containerName} -d --restart unless-stopped`,
    ];
    server.ports.forEach((port) => {
      dockerRun.push(`-p ${port.number}:${port.number}/${port.protocol}`);
    });
    server.volumes.forEach((volume) => {
      dockerRun.push(`-v ${volume.hostPath}:${volume.containerPath}`);
    });
    dockerRun.push(`${server.containerName}`);

    try {
      // Write out the Dockerfile and any other files this server has configured
      // to a temporary workding directory.
      await exec(`sudo mkdir ${temporaryDirectoryName}`);
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
      await exec(`sudo rm -rf ${temporaryDirectoryName}`);
    }

    // Send the instruction to stop, remove, and run the new container all at once.
    // Doing these instructions in one exec allows server-manager-service
    // to update itself.
    await exec(`
      sudo docker stop ${server.containerName}
      sudo docker rm ${server.containerName}
      ${dockerRun.join(" ")}
    `);

    // Respond with complete server to indicate the update is complete.
    res.json(server);
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
    const { isUpdatable: isUpdatableQuery } = req.query;
    const isUpdatable = this.stringToBoolean(isUpdatableQuery as string);
    const query = {
      select: ServersService.defaultServerSelect,
      where: { isUpdatable },
    };
    const servers = await this.prisma.server
      .findMany(query)
      .catch((e) => handleDatabaseErrors(e, "server", []));
    res.json(servers);
  }

  /* GET server by id. */
  async getServerById(req: Request, res: Response) {
    const { id } = req.params;
    const server = await this.prisma.server
      .findUniqueOrThrow({
        where: { id: String(id) },
        select: ServersService.defaultServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [id]));
    res.json(server);
  }

  /* GET complete server by id. */
  async getCompleteServerById(req: Request, res: Response) {
    const { id } = req.params;
    const server = await this.prisma.server
      .findUniqueOrThrow({
        where: { id: String(id) },
        select: ServersService.completeServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [id]));
    res.json(server);
  }

  /* PATCH a new server. */
  async patchServer(req: Request, res: Response) {
    const { id } = req.params;
    const { applicationName, containerName, isUpdatable } = req.body;
    const server = await this.prisma.server
      .update({
        where: { id: String(id) },
        data: {
          applicationName,
          containerName,
          isUpdatable,
        },
        select: ServersService.defaultServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [id]));
    res.json(server);
  }

  /* DELETE an existing server. */
  async deleteServer(req: Request, res: Response) {
    const { id } = req.params;
    const server = await this.prisma.server
      .delete({
        where: {
          id: String(id),
        },
        select: ServersService.defaultServerSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "server", [id]));
    res.json(server);
  }
}

export { ServersService };
