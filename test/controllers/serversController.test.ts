import { ServersController } from "../../src/controllers";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
jest.mock("@prisma/client");
jest.mock("../../src/services/serversService");

describe("ServersController", () => {
  const req: Request = jest.fn() as unknown as Request;
  const res: Response = jest.fn() as unknown as Response;
  const serversController = new ServersController();

  it("should use passed in prisma client", () => {
    const prisma = new PrismaClient();
    const serversController2 = new ServersController(prisma);
    expect(serversController2.serversService.constructor).toHaveBeenCalledWith(
      prisma
    );
  });

  describe("createServer", () => {
    it("should call createServer in ServersService", () => {
      serversController.createServer(req, res);
      expect(
        serversController.serversService.createServer
      ).toHaveBeenCalledWith(req, res);
    });
  });

  describe("restartServer", () => {
    it("should call restartServer in ServersService", () => {
      serversController.restartServer(req, res);
      expect(
        serversController.serversService.restartServer
      ).toHaveBeenCalledWith(req, res);
    });
  });

  describe("getServers", () => {
    it("should call getServers in ServersService", () => {
      serversController.getServers(req, res);
      expect(serversController.serversService.getServers).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });

  describe("getServerById", () => {
    it("should call getServerById in ServersService", () => {
      serversController.getServerById(req, res);
      expect(
        serversController.serversService.getServerById
      ).toHaveBeenCalledWith(req, res);
    });
  });

  describe("patchServer", () => {
    it("should call patchServer in ServersService", () => {
      serversController.patchServer(req, res);
      expect(serversController.serversService.patchServer).toHaveBeenCalledWith(
        req,
        res
      );
    });
  });

  describe("deleteServer", () => {
    it("should call deleteServer in ServersService", () => {
      serversController.deleteServer(req, res);
      expect(
        serversController.serversService.deleteServer
      ).toHaveBeenCalledWith(req, res);
    });
  });
});
