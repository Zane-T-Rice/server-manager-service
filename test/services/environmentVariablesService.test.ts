import { EnvironmentVariablesService } from "../../src/services";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { handleDatabaseErrors } from "../../src/utils";
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      return {
        environmentVariable: {
          create: jest.fn(),
          findMany: jest.fn(),
          findUniqueOrThrow: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      };
    }),
  };
});
jest.mock("../../src/utils/handleDatabaseErrors", () => {
  return {
    handleDatabaseErrors: jest.fn().mockRejectedValue(new Error()),
  };
});

describe("EnvironmentVariablesService", () => {
  const params = { hostId: "hostId", serverId: "serverId" };
  const body = { name: "env-variable-name", value: "value-of-env-variable" };
  const mockEnvironmentVariableRecord = {
    ...body,
    id: "environmentVariableid",
    serverId: params.serverId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const req: Request = {
    body,
    // In some routes, the environmentVariable id is not used, but the code
    // should be able to handle that anyways.
    params: {
      hostId: params.hostId,
      serverId: params.serverId,
      environmentVariableId: mockEnvironmentVariableRecord.id,
    },
  } as unknown as Request;
  const res: Response = { json: jest.fn() } as unknown as Response;
  const where = {
    id: mockEnvironmentVariableRecord.id,
    server: { id: params.serverId, hostId: params.hostId },
  };
  const data = {
    serverId: params.serverId,
    ...body,
  };
  const environmentVariablesService = new EnvironmentVariablesService();
  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .spyOn(environmentVariablesService.prisma.environmentVariable, "create")
      .mockResolvedValue(mockEnvironmentVariableRecord);
    jest
      .spyOn(environmentVariablesService.prisma.environmentVariable, "findMany")
      .mockResolvedValue([mockEnvironmentVariableRecord]);
    jest
      .spyOn(
        environmentVariablesService.prisma.environmentVariable,
        "findUniqueOrThrow"
      )
      .mockResolvedValue(mockEnvironmentVariableRecord);
    jest
      .spyOn(environmentVariablesService.prisma.environmentVariable, "update")
      .mockResolvedValue(mockEnvironmentVariableRecord);
    jest
      .spyOn(environmentVariablesService.prisma.environmentVariable, "delete")
      .mockResolvedValue(mockEnvironmentVariableRecord);
  });

  it("should use passed in prisma client if no prisma client is set", () => {
    // @ts-expect-error to make testing easier
    EnvironmentVariablesService.instance.prisma = undefined;
    const prisma = new PrismaClient();
    const environmentVariablesService2 = new EnvironmentVariablesService(
      prisma
    );
    expect(environmentVariablesService2.prisma).toEqual(prisma);
  });

  it("should use existing prisma client even if another is passed in", () => {
    const currentPrisma = EnvironmentVariablesService.instance.prisma;
    const prisma = new PrismaClient();
    const environmentVariablesService2 = new EnvironmentVariablesService(
      prisma
    );
    expect(environmentVariablesService2.prisma).toEqual(currentPrisma);
  });

  describe("POST /", () => {
    it("should create a new environmentVariable record and return the new record", async () => {
      await environmentVariablesService.createEnvironmentVariable(req, res);
      expect(
        environmentVariablesService.prisma.environmentVariable.create
      ).toHaveBeenCalledWith({
        data,
        select: EnvironmentVariablesService.defaultEnvironmentVariableSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockEnvironmentVariableRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(environmentVariablesService.prisma.environmentVariable, "create")
        .mockRejectedValue(new Error());
      try {
        await environmentVariablesService.createEnvironmentVariable(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        environmentVariablesService.prisma.environmentVariable.create
      ).toHaveBeenCalledWith({
        data,
        select: EnvironmentVariablesService.defaultEnvironmentVariableSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "environment variable",
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("GET /", () => {
    it("Should return list of environmentVariables", async () => {
      await environmentVariablesService.getEnvironmentVariables(req, res);
      expect(
        environmentVariablesService.prisma.environmentVariable.findMany
      ).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([mockEnvironmentVariableRecord]);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(
          environmentVariablesService.prisma.environmentVariable,
          "findMany"
        )
        .mockRejectedValue(new Error());
      try {
        await environmentVariablesService.getEnvironmentVariables(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        environmentVariablesService.prisma.environmentVariable.findMany
      ).toHaveBeenCalled();
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "environment variable",
        []
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("GET /:id", () => {
    it("Should return environmentVariable", async () => {
      await environmentVariablesService.getEnvironmentVariableById(req, res);
      expect(
        environmentVariablesService.prisma.environmentVariable.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where,
        select: EnvironmentVariablesService.defaultEnvironmentVariableSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockEnvironmentVariableRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(
          environmentVariablesService.prisma.environmentVariable,
          "findUniqueOrThrow"
        )
        .mockRejectedValue(new Error());
      try {
        await environmentVariablesService.getEnvironmentVariableById(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        environmentVariablesService.prisma.environmentVariable.findUniqueOrThrow
      ).toHaveBeenCalledWith({
        where,
        select: EnvironmentVariablesService.defaultEnvironmentVariableSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "environment variable",
        [mockEnvironmentVariableRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /:id", () => {
    it("Should patch environmentVariable", async () => {
      await environmentVariablesService.patchEnvironmentVariable(req, res);
      expect(
        environmentVariablesService.prisma.environmentVariable.update
      ).toHaveBeenCalledWith({
        data: { ...body },
        where,
        select: EnvironmentVariablesService.defaultEnvironmentVariableSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockEnvironmentVariableRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(environmentVariablesService.prisma.environmentVariable, "update")
        .mockRejectedValue(new Error());
      try {
        await environmentVariablesService.patchEnvironmentVariable(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        environmentVariablesService.prisma.environmentVariable.update
      ).toHaveBeenCalledWith({
        data: { ...body },
        where,
        select: EnvironmentVariablesService.defaultEnvironmentVariableSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "environment variable",
        [mockEnvironmentVariableRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /:id", () => {
    it("Should delete environmentVariable", async () => {
      await environmentVariablesService.deleteEnvironmentVariable(req, res);
      expect(
        environmentVariablesService.prisma.environmentVariable.delete
      ).toHaveBeenCalledWith({
        where,
        select: EnvironmentVariablesService.defaultEnvironmentVariableSelect,
      });
      expect(res.json).toHaveBeenCalledWith(mockEnvironmentVariableRecord);
    });
    it("should handle any database errors", async () => {
      expect.assertions(4);
      jest
        .spyOn(environmentVariablesService.prisma.environmentVariable, "delete")
        .mockRejectedValue(new Error());
      try {
        await environmentVariablesService.deleteEnvironmentVariable(req, res);
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
      expect(
        environmentVariablesService.prisma.environmentVariable.delete
      ).toHaveBeenCalledWith({
        where,
        select: EnvironmentVariablesService.defaultEnvironmentVariableSelect,
      });
      expect(handleDatabaseErrors).toHaveBeenCalledWith(
        expect.any(Error),
        "environment variable",
        [mockEnvironmentVariableRecord.id]
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
