import { NextFunction, Request, Response } from "express";

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const errorHandler = (fn: Function) =>
  function errorHandlerWrap(
    req: Request,
    res: Response,
    next: NextFunction,
    // eslint-disable-next-line
    ...rest: any[]
  ) {
    const fnReturn = fn(req, res, next, ...rest);
    return Promise.resolve(fnReturn).catch(next);
  };

export { errorHandler };
