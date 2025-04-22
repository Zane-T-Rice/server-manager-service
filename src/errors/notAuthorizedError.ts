import { ErrorMessageNames, ErrorMessages } from "../constants";

class NotAuthorizedError implements Error {
  name = ErrorMessageNames.notAuthorizedError;
  message: string = "";

  constructor() {
    this.message = ErrorMessages.notAuthorizedError;
  }
}

export { NotAuthorizedError };
