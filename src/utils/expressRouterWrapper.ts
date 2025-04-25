import express, { RequestHandler, Router } from "express";
import { errorHandler } from "../middlewares";

class ExpressRouterWrapper {
  router: Router = express.Router({ mergeParams: true });

  constructor() {}

  async post(path: string, fn: RequestHandler | RequestHandler[]) {
    this.router.post(
      path,
      fn instanceof Array ? fn.map(errorHandler) : errorHandler(fn)
    );
  }

  async get(path: string, fn: RequestHandler | RequestHandler[]) {
    this.router.get(
      path,
      fn instanceof Array ? fn.map(errorHandler) : errorHandler(fn)
    );
  }

  async patch(path: string, fn: RequestHandler | RequestHandler[]) {
    this.router.patch(
      path,
      fn instanceof Array ? fn.map(errorHandler) : errorHandler(fn)
    );
  }

  async delete(path: string, fn: RequestHandler | RequestHandler[]) {
    this.router.delete(
      path,
      fn instanceof Array ? fn.map(errorHandler) : errorHandler(fn)
    );
  }
}

export { ExpressRouterWrapper };
