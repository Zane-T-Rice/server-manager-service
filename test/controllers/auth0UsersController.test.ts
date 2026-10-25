import { Auth0UsersController } from "../../src/controllers";
import { Request, Response } from "express";
import { Auth0UsersService } from "../../src/services";
jest.mock("../../src/services/auth0UsersService");

describe("Auth0UsersController", () => {
  const req: Request = jest.fn() as unknown as Request;
  const res: Response = jest.fn() as unknown as Response;
  const auth0UsersController = new Auth0UsersController();
  Auth0UsersService.instance = {
    getAuth0Users: jest.fn(),
  };

  describe("getAuth0Users", () => {
    it("should call getAuth0Users in Auth0UsersService", async () => {
      await auth0UsersController.getAuth0Users(req, res);
      expect(Auth0UsersService.instance.getAuth0Users).toHaveBeenCalledWith(
        req,
        res,
      );
    });
  });
});
