import { Request, Response } from "express";
import { exec as exec2 } from "child_process";
import { handleDatabaseErrors } from "../utils/handleDatabaseErrors";
import { PrismaClient } from "@prisma/client";
import { promisify } from "util";
const exec = promisify(exec2);

class ServersService {
  prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? new PrismaClient();
  }

  /* POST a new server. */
  async createServer(req: Request, res: Response) {
    const { applicationName, containerName } = req.body;
    const server = await this.prisma.server
      .create({
        data: { applicationName, containerName },
      })
      .catch((e) => handleDatabaseErrors(e, "server", []));
    res.json(server);
  }

  /* POST restart an existing server. */
  async restartServer(req: Request, res: Response) {
    const { id } = req.params;
    const server = await this.prisma.server
      .findUniqueOrThrow({ where: { id: String(id) } })
      .catch((e) => handleDatabaseErrors(e, "server", [id]));
    await exec(`docker restart '${server?.containerName}'`);
    res.json(server);
  }

  /* GET all servers. */
  async getServers(req: Request, res: Response) {
    const servers = await this.prisma.server
      .findMany()
      .catch((e) => handleDatabaseErrors(e, "server", []));
    res.json(servers);
  }

  /* GET server by id. */
  async getServerById(req: Request, res: Response) {
    const { id } = req.params;
    const server = await this.prisma.server
      .findUniqueOrThrow({
        where: { id: String(id) },
      })
      .catch((e) => handleDatabaseErrors(e, "server", [id]));
    res.json(server);
  }

  /* PATCH a new server. */
  async patchServer(req: Request, res: Response) {
    const { id } = req.params;
    const { applicationName, containerName } = req.body;
    const server = await this.prisma.server
      .update({
        data: { applicationName, containerName },
        where: { id: String(id) },
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
      })
      .catch((e) => handleDatabaseErrors(e, "server", [id]));
    res.json(server);
  }
}

export { ServersService };
