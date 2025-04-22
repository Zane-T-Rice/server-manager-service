import { ErrorMessageNames, ErrorMessages } from "../constants";
import { formatMessage } from "../utils";

class NotFoundError extends Error {
  name = ErrorMessageNames.notFoundError;

  constructor(resource: string, ids: string[]) {
    super();
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
