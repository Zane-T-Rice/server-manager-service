import { ErrorMessageNames, ErrorMessages } from "../constants";

class NotAuthorizedError implements Error {
  name: string = ErrorMessageNames.notAuthorizedError;
  message: string = "";

  constructor() {
    this.message = ErrorMessages.notAuthorizedError;
  }
}

export { NotAuthorizedError };
