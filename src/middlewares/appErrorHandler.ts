import { NextFunction, Request, Response } from "express";
import { InternalServerError, NotAuthorizedError } from "../errors";
import { ErrorMessageNames } from "../constants";

function appErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.log.error(err);
  if (err.name === ErrorMessageNames.badRequestError) {
    res.status(400).json(err);
  } else if (
    err.name === ErrorMessageNames.notAuthorizedError ||
    err.name === ErrorMessageNames.insufficientScopeError
  ) {
    // This error originates from the OAuth JWT verification and scope checking.
    res.status(403).json(new NotAuthorizedError());
  } else if (
    err.name === ErrorMessageNames.invalidRequestError ||
    err.name === ErrorMessageNames.invalidTokenError
  ) {
    // These originate from the OAuth JWT verification too: there is no token, or it is not a good one
    // (malformed, expired, for another audience). The caller needs to sign in again, which is not a server error.
    res.status(401).json(new NotAuthorizedError());
  } else if (err.name === ErrorMessageNames.notFoundError) {
    res.status(404).json(err);
  } else if (err.name === ErrorMessageNames.internalServerError) {
    res.status(500).json(err);
  } else {
    res.status(500).json(new InternalServerError());
  }
  next();
}

export { appErrorHandler };
