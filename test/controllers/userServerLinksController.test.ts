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
    getUserServerLinks: jest.fn(),
    createUserServerLinkByUserId: jest.fn(),
    deleteUserServerLinkByUserId: jest.fn(),
  };

  it("should use passed in prisma client", () => {
    const prisma = new PrismaClient();
    new UserServerLinksController(prisma);
    expect(UserServerLinksService).toHaveBeenCalledWith(prisma);
  });

  describe("getUserServerLinks", () => {
    it("should call getUserServerLinks in UserServerLinksService", async () => {
      await serversController.getUserServerLinks(req, res);
      expect(
        UserServerLinksService.instance.getUserServerLinks
      ).toHaveBeenCalledWith(req, res);
    });
  });

  describe("createUserServerLinkByUserId", () => {
    it("should call createUserServerLinkByUserId in UserServerLinksService", async () => {
      await serversController.createUserServerLinkByUserId(req, res);
      expect(
        UserServerLinksService.instance.createUserServerLinkByUserId
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
