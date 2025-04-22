import { requiredScopes } from "express-oauth2-jwt-bearer";
import { ExpressRouterWrapper } from "../../src/utils";
import { errorHandler } from "../../src/middlewares";
jest.mock("../../src/middlewares", () => {
  return { errorHandler: jest.fn().mockReturnValue(true) };
});
jest.mock("express-oauth2-jwt-bearer", () => {
  return { requiredScopes: jest.fn().mockReturnValue(true) };
});

describe("expressRouterWrapper", () => {
  const path = "/";
  const expressRouterWrapper = new ExpressRouterWrapper();
  const postSpy = jest
    .spyOn(expressRouterWrapper.router, "post")
    .mockReturnValue(expressRouterWrapper.router);
  const getSpy = jest
    .spyOn(expressRouterWrapper.router, "get")
    .mockReturnValue(expressRouterWrapper.router);
  const patchSpy = jest
    .spyOn(expressRouterWrapper.router, "patch")
    .mockReturnValue(expressRouterWrapper.router);
  const deleteSpy = jest
    .spyOn(expressRouterWrapper.router, "delete")
    .mockReturnValue(expressRouterWrapper.router);
  const routeFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    { verb: "post", spy: postSpy, route: "post" },
    { verb: "get", spy: getSpy, route: "get" },
    { verb: "patch", spy: patchSpy, route: "patch" },
    { verb: "delete", spy: deleteSpy, route: "delete" },
  ])(
    `should call express router $verb with errorHandler wrapper`,
    async ({ spy, route }) => {
      // @ts-expect-error to make testing easier
      await expressRouterWrapper[route](path, routeFunction, "read:servers");
      expect(errorHandler).toHaveBeenCalledWith(routeFunction);
      expect(requiredScopes).toHaveBeenCalledWith("read:servers");
      expect(spy).toHaveBeenCalledWith(path, true, true);

      // @ts-expect-error to make testing easier
      await expressRouterWrapper[route](path, [routeFunction], "read:servers");
      expect(errorHandler).toHaveBeenCalledWith(routeFunction);
      expect(requiredScopes).toHaveBeenCalledWith("read:servers");
      expect(spy).toHaveBeenCalledWith(path, true, true);
    }
  );
});
