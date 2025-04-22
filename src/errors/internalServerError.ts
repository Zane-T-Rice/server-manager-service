import { ErrorMessageNames, ErrorMessages } from "../constants";

class InternalServerError extends Error {
  name = ErrorMessageNames.internalServerError;

  constructor(message?: string) {
    super(message ?? ErrorMessages.internalServerError);
  }
}

export { InternalServerError };
