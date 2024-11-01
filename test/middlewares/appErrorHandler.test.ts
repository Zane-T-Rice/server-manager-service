import { InternalServerError, NotFoundError } from "../../src/errors";
import { appErrorHandler } from "../../src/middlewares/appErrorHandler";
import { Request, Response, NextFunction } from "express";

describe("appErrorHandler", () => {
  const reqMock: Request = jest.fn() as unknown as Request;
  const resMock: Response = {
    status: jest.fn(() => resMock),
    json: jest.fn(() => resMock),
  } as unknown as Response;
  const nextMock: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should set 404 status and return NotFoundError", () => {
    const notFoundError = new NotFoundError("server", ["id"]);
    appErrorHandler(notFoundError, reqMock, resMock, nextMock);

    expect(resMock.status).toHaveBeenCalledWith(404);
    expect(resMock.json).toHaveBeenCalledWith(notFoundError);
  });

  it("should set 500 status and return InternalServerError", () => {
    const internalServerError = new InternalServerError();
    appErrorHandler(internalServerError, reqMock, resMock, nextMock);

    expect(resMock.status).toHaveBeenCalledWith(500);
    expect(resMock.json).toHaveBeenCalledWith(internalServerError);
  });

  it("should set 500 status and return InternalServerError as a default", () => {
    const error = new Error();
    appErrorHandler(error, reqMock, resMock, nextMock);

    expect(resMock.status).toHaveBeenCalledWith(500);
    expect(resMock.json).toHaveBeenCalledWith(new InternalServerError());
  });
});
