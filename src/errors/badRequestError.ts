import { ErrorMessageNames } from "../constants";

class BadRequestError extends Error {
  name = ErrorMessageNames.badRequestError;

  constructor(message: string) {
    super(message);
  }
}

export { BadRequestError };
