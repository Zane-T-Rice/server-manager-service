import { ErrorMessageNames, ErrorMessages } from "../constants";

class InternalServerError extends Error {
  name = ErrorMessageNames.internalServerError;

  constructor(message?: string) {
    super();
    this.message = message ?? ErrorMessages.internalServerError;
  }
}

export { InternalServerError };
