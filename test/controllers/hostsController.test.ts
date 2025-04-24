import { HostsController } from "../../src/controllers";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { HostsService } from "../../src/services";
jest.mock("@prisma/client");
jest.mock("../../src/services/hostsService");

describe("HostsController", () => {
  const req: Request = jest.fn() as unknown as Request;
  const res: Response = jest.fn() as unknown as Response;
  const hostsController = new HostsController();
  // @ts-expect-error to make testing easier
  HostsService.instance = {
    createHost: jest.fn(),
    getHosts: jest.fn(),
    getHostById: jest.fn(),
    patchHost: jest.fn(),
    deleteHost: jest.fn(),
  };

  it("should use passed in prisma client", () => {
    const prisma = new PrismaClient();
    new HostsController(prisma);
    expect(HostsService).toHaveBeenCalledWith(prisma);
  });

  describe("createHost", () => {
    it("should call createHost in HostsService", async () => {
      await hostsController.createHost(req, res);
      expect(HostsService.instance.createHost).toHaveBeenCalledWith(req, res);
    });
  });

  describe("getHosts", () => {
    it("should call getHosts in HostsService", async () => {
      await hostsController.getHosts(req, res);
      expect(HostsService.instance.getHosts).toHaveBeenCalledWith(req, res);
    });
  });

  describe("getHostById", () => {
    it("should call getHostById in HostsService", async () => {
      await hostsController.getHostById(req, res);
      expect(HostsService.instance.getHostById).toHaveBeenCalledWith(req, res);
    });
  });

  describe("patchHost", () => {
    it("should call patchHost in HostsService", async () => {
      await hostsController.patchHost(req, res);
      expect(HostsService.instance.patchHost).toHaveBeenCalledWith(req, res);
    });
  });

  describe("deleteHost", () => {
    it("should call deleteHost in HostsService", async () => {
      await hostsController.deleteHost(req, res);
      expect(HostsService.instance.deleteHost).toHaveBeenCalledWith(req, res);
    });
  });
});
