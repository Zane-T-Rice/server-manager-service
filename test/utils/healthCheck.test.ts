import { Request } from "express";
import { canCheckHealth, healthCheck } from "../../src/utils";

describe("canCheckHealth", () => {
  const ask = (auth: object | undefined) => {
    const next = jest.fn();
    try {
      canCheckHealth({ auth } as never, {} as never, next);
    } catch (e) {
      next(e);
    }
    return next;
  };

  it.each([
    "server-manager:admin",
    "server-manager:public",
    "other server-manager:public",
  ])("lets a token with the scope %s through", (scope) => {
    const next = ask({ payload: { scope } });
    expect(next).toHaveBeenCalledWith();
  });

  it("refuses a valid token that has neither permission", () => {
    const next = ask({ payload: { scope: "gloomhaven-companion:public" } });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });

  it("refuses a token with no scopes at all", () => {
    const next = ask({ payload: {} });
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
  });

  it("refuses a request that is not logged in", () => {
    const next = ask(undefined);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });
});

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
