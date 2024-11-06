import { EnvironmentVariablesController } from "../../src/controllers";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { EnvironmentVariablesService } from "../../src/services";
jest.mock("@prisma/client");
jest.mock("../../src/services/environmentVariablesService");

describe("EnvironmentVariablesController", () => {
  const req: Request = jest.fn() as unknown as Request;
  const res: Response = jest.fn() as unknown as Response;
  const environmentVariablesController = new EnvironmentVariablesController();
  // @ts-expect-error to make testing easier
  EnvironmentVariablesService.instance = {
    createEnvironmentVariable: jest.fn(),
    getEnvironmentVariables: jest.fn(),
    getEnvironmentVariableById: jest.fn(),
    patchEnvironmentVariable: jest.fn(),
    deleteEnvironmentVariable: jest.fn(),
  };

  it("should use passed in prisma client", () => {
    const prisma = new PrismaClient();
    new EnvironmentVariablesController(prisma);
    expect(EnvironmentVariablesService).toHaveBeenCalledWith(prisma);
  });

  describe("createEnvironmentVariable", () => {
    it("should call createEnvironmentVariable in EnvironmentVariablesService", async () => {
      await environmentVariablesController.createEnvironmentVariable(req, res);
      expect(
        EnvironmentVariablesService.instance.createEnvironmentVariable
      ).toHaveBeenCalledWith(req, res);
    });
  });

  describe("getEnvironmentVariables", () => {
    it("should call getEnvironmentVariables in EnvironmentVariablesService", async () => {
      await environmentVariablesController.getEnvironmentVariables(req, res);
      expect(
        EnvironmentVariablesService.instance.getEnvironmentVariables
      ).toHaveBeenCalledWith(req, res);
    });
  });

  describe("getEnvironmentVariableById", () => {
    it("should call getEnvironmentVariableById in EnvironmentVariablesService", async () => {
      await environmentVariablesController.getEnvironmentVariableById(req, res);
      expect(
        EnvironmentVariablesService.instance.getEnvironmentVariableById
      ).toHaveBeenCalledWith(req, res);
    });
  });

  describe("patchEnvironmentVariable", () => {
    it("should call patchEnvironmentVariable in EnvironmentVariablesService", async () => {
      await environmentVariablesController.patchEnvironmentVariable(req, res);
      expect(
        EnvironmentVariablesService.instance.patchEnvironmentVariable
      ).toHaveBeenCalledWith(req, res);
    });
  });

  describe("deleteEnvironmentVariable", () => {
    it("should call deleteEnvironmentVariable in EnvironmentVariablesService", async () => {
      await environmentVariablesController.deleteEnvironmentVariable(req, res);
      expect(
        EnvironmentVariablesService.instance.deleteEnvironmentVariable
      ).toHaveBeenCalledWith(req, res);
    });
  });
});
