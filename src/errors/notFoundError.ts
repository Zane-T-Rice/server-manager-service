import { ErrorMessageNames, ErrorMessages } from "../constants";
import { formatMessage } from "../utils";

class NotFoundError implements Error {
  name: string = ErrorMessageNames.notFoundError;
  message: string = "";

  constructor(resource: string, ids: string[]) {
    if (ids.length > 1) {
      this.message = formatMessage(ErrorMessages.multipleNotFoundError, {
        resource,
        ids: ids.join(","),
      });
    } else {
      this.message = formatMessage(ErrorMessages.singleNotFoundError, {
        resource,
        id: ids[0],
      });
    }
  }
}

export { NotFoundError };
