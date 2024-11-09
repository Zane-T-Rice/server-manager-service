import { NextFunction, Request, Response } from "express";
import { InternalServerError } from "../errors";

function appErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.log.error(err);
  if (err.name === "NotFoundError") {
    res.status(404).json(err);
  } else if (err.name === "InternalServerError") {
    res.status(500).json(err);
  } else if (err.name === "NotAuthorizedError") {
    res.status(401).json(err);
  } else {
    res.status(500).json(new InternalServerError());
  }
  next();
}

export { appErrorHandler };
