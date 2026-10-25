import { Request, Response } from "express";
import { Auth0UsersService } from "../services";

class Auth0UsersController {
  static instance: Auth0UsersController;

  constructor() {
    new Auth0UsersService(); // Initialize Auth0UsersService singleton.
    Auth0UsersController.instance = Auth0UsersController.instance ?? this;
    return Auth0UsersController.instance;
  }

  /* Get Auth0 users and machine-to-machine applications. */
  async getAuth0Users(req: Request, res: Response) {
    await Auth0UsersService.instance.getAuth0Users(req, res);
  }
}

export { Auth0UsersController };
