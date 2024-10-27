import express, { RequestHandler, Router } from "express";
import { errorHandler } from "../middlewares";

class ExpressRouterWrapper {
  router: Router = express.Router();

  constructor() {}

  async post(path: string, fn: RequestHandler) {
    this.router.post(path, errorHandler(fn));
  }

  async get(path: string, fn: RequestHandler) {
    this.router.get(path, errorHandler(fn));
  }

  async patch(path: string, fn: RequestHandler) {
    this.router.patch(path, errorHandler(fn));
  }

  async delete(path: string, fn: RequestHandler) {
    this.router.delete(path, errorHandler(fn));
  }
}

export { ExpressRouterWrapper };
