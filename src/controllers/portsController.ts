import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PortsService } from "../services";

class PortsController {
  static instance: PortsController;

  constructor(prisma?: PrismaClient) {
    new PortsService(prisma); // Initialize PortsService singleton.
    PortsController.instance = PortsController.instance ?? this;
    return PortsController.instance;
  }

  /* POST a new port. */
  async createPort(req: Request, res: Response) {
    await PortsService.instance.createPort(req, res);
  }

  /* GET all ports. */
  async getPorts(req: Request, res: Response) {
    await PortsService.instance.getPorts(req, res);
  }

  /* GET port by id. */
  async getPortById(req: Request, res: Response) {
    await PortsService.instance.getPortById(req, res);
  }

  /* PATCH a new port. */
  async patchPort(req: Request, res: Response) {
    await PortsService.instance.patchPort(req, res);
  }

  /* DELETE an existing port. */
  async deletePort(req: Request, res: Response) {
    await PortsService.instance.deletePort(req, res);
  }
}

export { PortsController };
