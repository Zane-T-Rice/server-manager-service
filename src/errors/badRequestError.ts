import { ErrorMessageNames } from "../constants";

class BadRequestError implements Error {
  name = ErrorMessageNames.badRequestError;
  message: string = "";

  constructor(message: string) {
    this.message = message;
  }
}

export { BadRequestError };
