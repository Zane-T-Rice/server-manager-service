import { Auth0UsersService } from "../../src/services";
import { Request, Response } from "express";
import {
  listAuth0Users,
  searchAuth0ClientsByName,
  searchAuth0UsersByEmail,
} from "../../src/utils/auth0ManagementClient";

jest.mock("../../src/utils/auth0ManagementClient", () => {
  return {
    CLIENT_SUB_SUFFIX: "@clients",
    listAuth0Users: jest.fn(),
    searchAuth0ClientsByName: jest.fn(),
    searchAuth0UsersByEmail: jest.fn(),
  };
});

describe("Auth0UsersService", () => {
  new Auth0UsersService();
  const email = "user@example.com";
  const res: Response = {
    json: jest.fn(),
  } as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAuth0Users", () => {
    it("should return matching Auth0 users and machine-to-machine applications", async () => {
      (searchAuth0UsersByEmail as jest.Mock).mockResolvedValue([
        { user_id: "google-oauth2|1", email },
        { user_id: "auth0|2", email },
      ]);
      (searchAuth0ClientsByName as jest.Mock).mockResolvedValue([
        { client_id: "abc", name: "My Machine" },
      ]);
      await Auth0UsersService.instance.getAuth0Users(
        { query: { search: "user@" } } as unknown as Request,
        res,
      );
      expect(searchAuth0UsersByEmail).toHaveBeenCalledWith("user@");
      expect(searchAuth0ClientsByName).toHaveBeenCalledWith("user@");
      expect(res.json).toHaveBeenCalledWith([
        {
          userId: "google-oauth2|1",
          email,
          type: "user",
        },
        { userId: "auth0|2", email, type: "user" },
        {
          userId: "abc@clients",
          applicationName: "My Machine",
          type: "machine",
        },
      ]);
    });
    it("should list every user and machine on the first page when all is true", async () => {
      (listAuth0Users as jest.Mock).mockResolvedValue([
        { user_id: "auth0|1", email },
      ]);
      (searchAuth0ClientsByName as jest.Mock).mockResolvedValue([
        { client_id: "abc", name: "My Machine" },
      ]);
      await Auth0UsersService.instance.getAuth0Users(
        { query: { all: "true" } } as unknown as Request,
        res,
      );
      expect(listAuth0Users).toHaveBeenCalledWith(
        0,
        Auth0UsersService.allUsersPageSize,
      );
      expect(searchAuth0ClientsByName).toHaveBeenCalledWith("", 100);
      expect(searchAuth0UsersByEmail).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([
        { userId: "auth0|1", email, type: "user" },
        {
          userId: "abc@clients",
          applicationName: "My Machine",
          type: "machine",
        },
      ]);
    });
    it("should only list users on later pages when all is true", async () => {
      (listAuth0Users as jest.Mock).mockResolvedValue([]);
      await Auth0UsersService.instance.getAuth0Users(
        { query: { all: "true", page: "2" } } as unknown as Request,
        res,
      );
      expect(listAuth0Users).toHaveBeenCalledWith(
        2,
        Auth0UsersService.allUsersPageSize,
      );
      expect(searchAuth0ClientsByName).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([]);
    });
    it("should not search Auth0 without an email", async () => {
      await Auth0UsersService.instance.getAuth0Users(
        { query: {} } as unknown as Request,
        res,
      );
      expect(searchAuth0UsersByEmail).not.toHaveBeenCalled();
      expect(searchAuth0ClientsByName).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });
});
