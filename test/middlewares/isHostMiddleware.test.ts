import { PrismaClient, Host } from "@prisma/client";
import { handleDatabaseErrors } from "../../src/utils";
import { isHostMiddleware } from "../../src/middlewares";
import { Request, Response } from "express";
jest.mock("@prisma/client");
jest.mock("../../src/utils/handleDatabaseErrors");

describe("isHostMiddleware", () => {
  jest.clearAllMocks();

  let prisma = {
    host: {
      findUniqueOrThrow: jest.fn(),
    },
  };
  let next = jest.fn();
  const hostId = "hostid";

  beforeEach(() => {
    prisma = {
      host: {
        findUniqueOrThrow: jest.fn(),
      },
    };
    next = jest.fn();
  });

  it("should call next if host exists", async () => {
    prisma.host.findUniqueOrThrow.mockResolvedValueOnce({} as unknown as Host);
    await isHostMiddleware(prisma as unknown as PrismaClient)(
      { params: { hostId } } as unknown as Request,
      {} as Response,
      next
    );
    expect(prisma.host.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: hostId },
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should call handleDatabaseErrors if host does not exist", async () => {
    prisma.host.findUniqueOrThrow.mockRejectedValueOnce(new Error());
    await isHostMiddleware(prisma as unknown as PrismaClient)(
      { params: { hostId } } as unknown as Request,
      {} as Response,
      next
    );
    expect(handleDatabaseErrors).toHaveBeenCalledWith(
      expect.any(Error),
      "host",
      [hostId]
    );
    expect(next).not.toHaveBeenCalled();
  });
});
