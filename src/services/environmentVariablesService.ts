import { Request, Response } from "express";
import { handleDatabaseErrors } from "../utils/handleDatabaseErrors";
import { PrismaClient } from "@prisma/client";

class EnvironmentVariablesService {
  static instance: EnvironmentVariablesService;
  prisma: PrismaClient;

  static defaultEnvironmentVariableSelect = {
    id: true,
    name: true,
    value: true,
  };

  constructor(prisma?: PrismaClient) {
    EnvironmentVariablesService.instance =
      EnvironmentVariablesService.instance ?? this;
    EnvironmentVariablesService.instance.prisma =
      EnvironmentVariablesService.instance.prisma ??
      prisma ??
      new PrismaClient();
    this.prisma = EnvironmentVariablesService.instance.prisma; // Effectively initializes PrismaClient as a singleton.
    return EnvironmentVariablesService.instance;
  }

  /* POST a new environment variable. */
  async createEnvironmentVariable(req: Request, res: Response) {
    const { serverId } = req.params;
    const { name, value } = req.body;
    const environmentVariable = await this.prisma.environmentVariable
      .create({
        data: {
          serverId,
          name,
          value,
        },
        select: EnvironmentVariablesService.defaultEnvironmentVariableSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "environment variable", []));
    res.json(environmentVariable);
  }

  /* GET all environment variable. */
  async getEnvironmentVariables(req: Request, res: Response) {
    const { hostId, serverId } = req.params;
    const environmentVariables = await this.prisma.environmentVariable
      .findMany({
        where: { server: { id: String(serverId), hostId: String(hostId) } },
        select: EnvironmentVariablesService.defaultEnvironmentVariableSelect,
      })
      .catch((e) => handleDatabaseErrors(e, "environment variable", []));
    res.json(environmentVariables);
  }

  /* GET environment variable by id. */
  async getEnvironmentVariableById(req: Request, res: Response) {
    const { hostId, serverId, environmentVariableId } = req.params;
    const environmentVariable = await this.prisma.environmentVariable
      .findUniqueOrThrow({
        where: {
          id: String(environmentVariableId),
          server: { id: String(serverId), hostId: String(hostId) },
        },
        select: EnvironmentVariablesService.defaultEnvironmentVariableSelect,
      })
      .catch((e) =>
        handleDatabaseErrors(e, "environment variable", [environmentVariableId])
      );
    res.json(environmentVariable);
  }

  /* PATCH an existing environment variable. */
  async patchEnvironmentVariable(req: Request, res: Response) {
    const { hostId, serverId, environmentVariableId } = req.params;
    const { name, value } = req.body;
    const environmentVariable = await this.prisma.environmentVariable
      .update({
        where: {
          id: String(environmentVariableId),
          server: {
            id: String(serverId),
            hostId: String(hostId),
          },
        },
        data: {
          name,
          value,
        },
        select: EnvironmentVariablesService.defaultEnvironmentVariableSelect,
      })
      .catch((e) =>
        handleDatabaseErrors(e, "environment variable", [environmentVariableId])
      );
    res.json(environmentVariable);
  }

  /* DELETE an existing environment variable. */
  async deleteEnvironmentVariable(req: Request, res: Response) {
    const { hostId, serverId, environmentVariableId } = req.params;
    const environmentVariable = await this.prisma.environmentVariable
      .delete({
        where: {
          id: String(environmentVariableId),
          server: {
            id: String(serverId),
            hostId: String(hostId),
          },
        },
        select: EnvironmentVariablesService.defaultEnvironmentVariableSelect,
      })
      .catch((e) =>
        handleDatabaseErrors(e, "environment variable", [environmentVariableId])
      );
    res.json(environmentVariable);
  }
}

export { EnvironmentVariablesService };
