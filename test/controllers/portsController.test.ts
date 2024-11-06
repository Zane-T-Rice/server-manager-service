import { PortsController } from "../../src/controllers";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { PortsService } from "../../src/services";
jest.mock("@prisma/client");
jest.mock("../../src/services/portsService");

describe("PortsController", () => {
  const req: Request = jest.fn() as unknown as Request;
  const res: Response = jest.fn() as unknown as Response;
  const portsController = new PortsController();
  // @ts-expect-error to make testing easier
  PortsService.instance = {
    createPort: jest.fn(),
    getPorts: jest.fn(),
    getPortById: jest.fn(),
    patchPort: jest.fn(),
    deletePort: jest.fn(),
  };

  it("should use passed in prisma client", () => {
    const prisma = new PrismaClient();
    new PortsController(prisma);
    expect(PortsService).toHaveBeenCalledWith(prisma);
  });

  describe("createPort", () => {
    it("should call createPort in PortsService", async () => {
      await portsController.createPort(req, res);
      expect(PortsService.instance.createPort).toHaveBeenCalledWith(req, res);
    });
  });

  describe("getPorts", () => {
    it("should call getPorts in PortsService", async () => {
      await portsController.getPorts(req, res);
      expect(PortsService.instance.getPorts).toHaveBeenCalledWith(req, res);
    });
  });

  describe("getPortById", () => {
    it("should call getPortById in PortsService", async () => {
      await portsController.getPortById(req, res);
      expect(PortsService.instance.getPortById).toHaveBeenCalledWith(req, res);
    });
  });

  describe("patchPort", () => {
    it("should call patchPort in PortsService", async () => {
      await portsController.patchPort(req, res);
      expect(PortsService.instance.patchPort).toHaveBeenCalledWith(req, res);
    });
  });

  describe("deletePort", () => {
    it("should call deletePort in PortsService", async () => {
      await portsController.deletePort(req, res);
      expect(PortsService.instance.deletePort).toHaveBeenCalledWith(req, res);
    });
  });
});
