import { ErrorMessageNames } from "../constants";

class BadRequestError extends Error {
  name = ErrorMessageNames.badRequestError;

  constructor(message: string) {
    super();
    this.message = message;
  }
}

export { BadRequestError };
