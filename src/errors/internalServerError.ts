import { ErrorMessageNames, ErrorMessages } from "../constants";

class InternalServerError implements Error {
  name = ErrorMessageNames.internalServerError;
  message: string = ErrorMessages.internalServerError;

  constructor(message?: string) {
    this.message = message ?? ErrorMessages.internalServerError;
  }
}

export { InternalServerError };
