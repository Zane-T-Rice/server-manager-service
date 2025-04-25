import { UserServerLinksController } from "../../src/controllers";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { UserServerLinksService } from "../../src/services";
jest.mock("@prisma/client");
jest.mock("../../src/services/userServerLinksService");

describe("UserServersController", () => {
  const req: Request = jest.fn() as unknown as Request;
  const res: Response = jest.fn() as unknown as Response;
  const serversController = new UserServerLinksController();
  // @ts-expect-error to make testing easier
  UserServerLinksService.instance = {
    patchUserServerLinkByUserId: jest.fn(),
    deleteUserServerLinkByUserId: jest.fn(),
  };

  it("should use passed in prisma client", () => {
    const prisma = new PrismaClient();
    new UserServerLinksController(prisma);
    expect(UserServerLinksService).toHaveBeenCalledWith(prisma);
  });

  describe("patchUserServerLinkByUserId", () => {
    it("should call patchUserServerLinkByUserId in UserServerLinksService", async () => {
      await serversController.patchUserServerLinkByUserId(req, res);
      expect(
        UserServerLinksService.instance.patchUserServerLinkByUserId
      ).toHaveBeenCalledWith(req, res);
    });
  });

  describe("deleteUserServerLinkByUserId", () => {
    it("should call deleteUserServerLinkByUserId in UserServerLinksService", async () => {
      await serversController.deleteUserServerLinkByUserId(req, res);
      expect(
        UserServerLinksService.instance.deleteUserServerLinkByUserId
      ).toHaveBeenCalledWith(req, res);
    });
  });
});
