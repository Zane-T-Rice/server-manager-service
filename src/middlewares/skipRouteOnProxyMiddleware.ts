import { NextFunction, Request, Response } from "express";

export function skipRouteOnProxyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (res.locals.didProxy) next("route");
  else next();
}
