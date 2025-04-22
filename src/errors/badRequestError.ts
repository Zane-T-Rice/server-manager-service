import { ErrorMessageNames } from "../constants";

class BadRequestError implements Error {
  name: string = ErrorMessageNames.badRequestError;
  message: string = "";

  constructor(message: string) {
    this.message = message;
  }
}

export { BadRequestError };
