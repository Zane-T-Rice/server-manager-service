import { Request, Response } from "express";
import { errorHandler } from "../../src/middlewares";

describe("errorHandler", () => {
  const nextFunctionResult = "An error was passed to next function.";
  const nextFunction = jest.fn().mockResolvedValue(nextFunctionResult);

  it("should return result for a resolved promise", async () => {
    const wrapper = errorHandler(jest.fn().mockResolvedValue(true));
    const result = wrapper(
      jest.fn() as unknown as Request,
      jest.fn() as unknown as Response,
      nextFunction
    );
    expect(await result).toBe(true);
  });

  it("should call next for a rejected promise", async () => {
    const wrapper = errorHandler(jest.fn().mockRejectedValue(false));
    const result = wrapper(
      jest.fn() as unknown as Request,
      jest.fn() as unknown as Response,
      nextFunction
    );
    expect(await result).toEqual(nextFunctionResult);
  });
});
