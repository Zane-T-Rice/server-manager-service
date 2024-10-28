import { NextFunction, Request, Response } from "express";
import { InternalServerError } from "../errors";

function appErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  if (err.name === "NotFoundError") {
    res.status(404).json(err);
  } else if (err.name == "InternalServerError") {
    res.status(500).json(err);
  } else {
    res.status(500).json(new InternalServerError());
  }
}

export { appErrorHandler };
