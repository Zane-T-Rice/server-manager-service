import { Request, Response } from "express";
import {
  CLIENT_SUB_SUFFIX,
  listAuth0Users,
  searchAuth0ClientsByName,
  searchAuth0UsersByEmail,
} from "../utils/auth0ManagementClient";

class Auth0UsersService {
  static instance: Auth0UsersService;

  static allUsersPageSize = 50;

  constructor() {
    Auth0UsersService.instance = Auth0UsersService.instance ?? this;
    return Auth0UsersService.instance;
  }

  /* Get Auth0 users and machine-to-machine applications.
   * Users are found by their email, machines by their name.
   * With all=true, instead list every user (a page at a time, see page) and,
   * on the first page, every machine. For when emails are not predictable.
   * These are not saved anywhere yet, so their id is the same as their userId. */
  async getAuth0Users(req: Request, res: Response) {
    const text = String(req.query.search ?? "");
    let users: Awaited<ReturnType<typeof searchAuth0UsersByEmail>> = [];
    let clients: Awaited<ReturnType<typeof searchAuth0ClientsByName>> = [];
    if (req.query.all === "true") {
      const page = Math.max(parseInt(String(req.query.page ?? "0")) || 0, 0);
      [users, clients] = await Promise.all([
        listAuth0Users(page, Auth0UsersService.allUsersPageSize),
        page === 0 ? searchAuth0ClientsByName("", 100) : [],
      ]);
    } else if (text) {
      [users, clients] = await Promise.all([
        searchAuth0UsersByEmail(text),
        searchAuth0ClientsByName(text),
      ]);
    }
    res.json([
      ...users.map((user) => ({
        id: user.user_id,
        userId: user.user_id,
        email: user.email,
        type: "user",
      })),
      ...clients.map((client) => ({
        id: `${client.client_id}${CLIENT_SUB_SUFFIX}`,
        userId: `${client.client_id}${CLIENT_SUB_SUFFIX}`,
        applicationName: client.name,
        type: "machine",
      })),
    ]);
  }
}

export { Auth0UsersService };
