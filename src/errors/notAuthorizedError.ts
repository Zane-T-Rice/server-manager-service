import { ErrorMessageNames, ErrorMessages } from "../constants";

class NotAuthorizedError extends Error {
  name = ErrorMessageNames.notAuthorizedError;

  constructor() {
    super(ErrorMessages.notAuthorizedError);
  }
}

export { NotAuthorizedError };
