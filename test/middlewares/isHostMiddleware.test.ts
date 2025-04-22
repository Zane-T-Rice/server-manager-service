import { PrismaClient, Host } from "@prisma/client";
import { handleDatabaseErrors } from "../../src/utils";
import { isHostMiddleware } from "../../src/middlewares";
import { Request, Response } from "express";
import { BadRequestError } from "../../src/errors";
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
    await isHostMiddleware(prisma as unknown as PrismaClient, false)(
      { body: { hostId } } as unknown as Request,
      {} as Response,
      next
    );
    expect(prisma.host.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: hostId },
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should call next if hostId is not part of request body", async () => {
    prisma.host.findUniqueOrThrow.mockResolvedValueOnce({} as unknown as Host);
    await isHostMiddleware(prisma as unknown as PrismaClient, false)(
      { body: {} } as unknown as Request,
      {} as Response,
      next
    );
    expect(prisma.host.findUniqueOrThrow).not.toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should throw BadRequestError if hostId is not set in the body when it is required", async () => {
    prisma.host.findUniqueOrThrow.mockRejectedValueOnce(new Error());
    await expect(
      async () =>
        await isHostMiddleware(prisma as unknown as PrismaClient, true)(
          { body: {} } as unknown as Request,
          {} as Response,
          next
        )
    ).rejects.toThrow(new BadRequestError("Argument `hostId` is missing."));
    expect(next).not.toHaveBeenCalled();
  });

  it("should call handleDatabaseErrors if host does not exist", async () => {
    prisma.host.findUniqueOrThrow.mockRejectedValueOnce(new Error());
    await isHostMiddleware(prisma as unknown as PrismaClient, false)(
      { body: { hostId } } as unknown as Request,
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
