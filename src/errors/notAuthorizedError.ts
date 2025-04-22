import { ErrorMessageNames, ErrorMessages } from "../constants";

class NotAuthorizedError extends Error {
  name = ErrorMessageNames.notAuthorizedError;

  constructor() {
    super();
    this.message = ErrorMessages.notAuthorizedError;
  }
}

export { NotAuthorizedError };
