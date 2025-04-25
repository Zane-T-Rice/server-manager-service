import { UserServersController } from "../../src/controllers";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { UserServersService } from "../../src/services";
jest.mock("@prisma/client");
jest.mock("../../src/services/userServersService");

describe("UserServersController", () => {
  const req: Request = jest.fn() as unknown as Request;
  const res: Response = jest.fn() as unknown as Response;
  const serversController = new UserServersController();
  // @ts-expect-error to make testing easier
  UserServersService.instance = {
    restartServer: jest.fn(),
    updateServer: jest.fn(),
    getServers: jest.fn(),
    getServerById: jest.fn(),
    deleteServer: jest.fn(),
    stopServer: jest.fn(),
  };

  it("should use passed in prisma client", () => {
    const prisma = new PrismaClient();
    new UserServersController(prisma);
    expect(UserServersService).toHaveBeenCalledWith(prisma);
  });

  describe("restartServer", () => {
    it("should call restartServer in UserServersService", async () => {
      await serversController.restartServer(req, res);
      expect(UserServersService.instance.restartServer).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });

  describe("updateServer", () => {
    it("should call updateServer in UserServersService", async () => {
      await serversController.updateServer(req, res);
      expect(UserServersService.instance.updateServer).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });

  describe("stopServer", () => {
    it("should call stopServer in UserServersService", async () => {
      await serversController.stopServer(req, res);
      expect(UserServersService.instance.stopServer).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });

  describe("getServers", () => {
    it("should call getServers in UserServersService", async () => {
      await serversController.getServers(req, res);
      expect(UserServersService.instance.getServers).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });

  describe("getServerById", () => {
    it("should call getServerById in UserServersService", async () => {
      await serversController.getServerById(req, res);
      expect(UserServersService.instance.getServerById).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });

  describe("deleteServer", () => {
    it("should call deleteServer in UserServersService", async () => {
      await serversController.deleteServer(req, res);
      expect(UserServersService.instance.deleteServer).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });
});
