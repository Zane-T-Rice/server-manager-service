import { NextFunction, Request, Response } from "express";

const errorHandler = (fn: Function) =>
  function errorHandlerWrap(
    req: Request,
    res: Response,
    next: NextFunction,
    ...rest: any[]
  ) {
    const fnReturn = fn(req, res, next, ...rest);
    return Promise.resolve(fnReturn).catch(next);
  };

export { errorHandler };
