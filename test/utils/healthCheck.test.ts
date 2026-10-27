import { Request } from "express";
import { healthCheck } from "../../src/utils";

describe("healthCheck", () => {
  const res = () => {
    const response = { json: jest.fn(), status: jest.fn() };
    response.status.mockReturnValue(response);
    return response;
  };

  it("answers ok when the database can be read", async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]) };
    const response = res();
    await healthCheck(prisma as never)({} as Request, response as never);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(response.json).toHaveBeenCalledWith({ status: "ok" });
    expect(response.status).not.toHaveBeenCalled();
  });

  it("answers 503 when the database cannot be read", async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error("down")),
    };
    const response = res();
    await healthCheck(prisma as never)({} as Request, response as never);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({ status: "unavailable" });
  });
});
