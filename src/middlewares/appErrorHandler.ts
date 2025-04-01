import { NextFunction, Request, Response } from "express";
import { InternalServerError, NotAuthorizedError } from "../errors";
import { ErrorMessageNames } from "../constants";

function appErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.log.error(err);
  if (err.name === ErrorMessageNames.notFoundError) {
    res.status(404).json(err);
  } else if (err.name === ErrorMessageNames.internalServerError) {
    res.status(500).json(err);
  } else if (err.name === ErrorMessageNames.notAuthorizedError) {
    // This error originates from the OAuth JWT verification and scope checking.
    res.status(401).json(new NotAuthorizedError());
  } else {
    res.status(500).json(new InternalServerError());
  }
  next();
}

export { appErrorHandler };
