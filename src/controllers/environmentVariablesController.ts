import { Request, Response } from "express";
import { EnvironmentVariablesService } from "../services";
import { PrismaClient } from "@prisma/client";

class EnvironmentVariablesController {
  static instance: EnvironmentVariablesController;

  constructor(prisma?: PrismaClient) {
    new EnvironmentVariablesService(prisma); // Initialize EnvironmentVariablesService singleton.
    EnvironmentVariablesController.instance =
      EnvironmentVariablesController.instance ?? this;
    return EnvironmentVariablesController.instance;
  }

  /* POST a new environment variable. */
  async createEnvironmentVariable(req: Request, res: Response) {
    await EnvironmentVariablesService.instance.createEnvironmentVariable(
      req,
      res
    );
  }

  /* GET all environment variables. */
  async getEnvironmentVariables(req: Request, res: Response) {
    await EnvironmentVariablesService.instance.getEnvironmentVariables(
      req,
      res
    );
  }

  /* GET environment variable by id. */
  async getEnvironmentVariableById(req: Request, res: Response) {
    await EnvironmentVariablesService.instance.getEnvironmentVariableById(
      req,
      res
    );
  }

  /* PATCH an existing environment variable. */
  async patchEnvironmentVariable(req: Request, res: Response) {
    await EnvironmentVariablesService.instance.patchEnvironmentVariable(
      req,
      res
    );
  }

  /* DELETE an existing environment variable. */
  async deleteEnvironmentVariable(req: Request, res: Response) {
    await EnvironmentVariablesService.instance.deleteEnvironmentVariable(
      req,
      res
    );
  }
}

export { EnvironmentVariablesController };
