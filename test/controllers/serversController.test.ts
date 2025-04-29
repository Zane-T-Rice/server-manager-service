import { ServersController } from "../../src/controllers";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { ServersService } from "../../src/services";
jest.mock("@prisma/client");
jest.mock("../../src/services/serversService");

describe("ServersController", () => {
  const req: Request = jest.fn() as unknown as Request;
  const res: Response = jest.fn() as unknown as Response;
  const serversController = new ServersController();
  // @ts-expect-error to make testing easier
  ServersService.instance = {
    createServer: jest.fn(),
    restartServer: jest.fn(),
    updateServer: jest.fn(),
    stopServer: jest.fn(),
    getServers: jest.fn(),
    getServerById: jest.fn(),
    patchServer: jest.fn(),
    deleteServer: jest.fn(),
  };

  it("should use passed in prisma client", () => {
    const prisma = new PrismaClient();
    new ServersController(prisma);
    expect(ServersService).toHaveBeenCalledWith(prisma);
  });

  describe("createServer", () => {
    it("should call createServer in ServersService", async () => {
      await serversController.createServer(req, res);
      expect(ServersService.instance.createServer).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });

  describe("restartServer", () => {
    it("should call restartServer in ServersService", async () => {
      await serversController.restartServer(req, res);
      expect(ServersService.instance.restartServer).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });

  describe("updateServer", () => {
    it("should call updateServer in ServersService", async () => {
      await serversController.updateServer(req, res);
      expect(ServersService.instance.updateServer).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });

  describe("stopServer", () => {
    it("should call stopServer in ServersService", async () => {
      await serversController.stopServer(req, res);
      expect(ServersService.instance.stopServer).toHaveBeenCalledWith(req, res);
    });
  });

  describe("getServers", () => {
    it("should call getServers in ServersService", async () => {
      await serversController.getServers(req, res);
      expect(ServersService.instance.getServers).toHaveBeenCalledWith(req, res);
    });
  });

  describe("getServerById", () => {
    it("should call getServerById in ServersService", async () => {
      await serversController.getServerById(req, res);
      expect(ServersService.instance.getServerById).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });

  describe("patchServer", () => {
    it("should call patchServer in ServersService", async () => {
      await serversController.patchServer(req, res);
      expect(ServersService.instance.patchServer).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });

  describe("deleteServer", () => {
    it("should call deleteServer in ServersService", async () => {
      await serversController.deleteServer(req, res);
      expect(ServersService.instance.deleteServer).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });
});
