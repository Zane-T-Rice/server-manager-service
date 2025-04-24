import express, { RequestHandler, Router } from "express";
import { errorHandler } from "../middlewares";
import { requiredScopes } from "express-oauth2-jwt-bearer";

class ExpressRouterWrapper {
  router: Router = express.Router({ mergeParams: true });

  constructor() {}

  async post(
    path: string,
    fn: RequestHandler | RequestHandler[],
    scopes: string
  ) {
    this.router.post(
      path,
      requiredScopes(scopes),
      fn instanceof Array ? fn.map(errorHandler) : errorHandler(fn)
    );
  }

  async get(
    path: string,
    fn: RequestHandler | RequestHandler[],
    scopes: string
  ) {
    this.router.get(
      path,
      requiredScopes(scopes),
      fn instanceof Array ? fn.map(errorHandler) : errorHandler(fn)
    );
  }

  async patch(
    path: string,
    fn: RequestHandler | RequestHandler[],
    scopes: string
  ) {
    this.router.patch(
      path,
      requiredScopes(scopes),
      fn instanceof Array ? fn.map(errorHandler) : errorHandler(fn)
    );
  }

  async delete(
    path: string,
    fn: RequestHandler | RequestHandler[],
    scopes: string
  ) {
    this.router.delete(
      path,
      requiredScopes(scopes),
      fn instanceof Array ? fn.map(errorHandler) : errorHandler(fn)
    );
  }
}

export { ExpressRouterWrapper };
