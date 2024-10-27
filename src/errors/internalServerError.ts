import { ErrorMessageNames, ErrorMessages } from "../constants";

class InternalServerError implements Error {
  name = ErrorMessageNames.internalServerError;
  message = ErrorMessages.internalServerError;

  constructor() {}
}

export { InternalServerError };
