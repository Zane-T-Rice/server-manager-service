import { ErrorMessageNames, ErrorMessages } from "../constants";
import { formatMessage } from "../utils";

class NotFoundError extends Error {
  name = ErrorMessageNames.notFoundError;

  constructor(resource: string, ids: string[]) {
    if (ids.length > 1) {
      super(
        formatMessage(ErrorMessages.multipleNotFoundError, {
          resource,
          ids: ids.join(","),
        })
      );
    } else {
      super(
        formatMessage(ErrorMessages.singleNotFoundError, {
          resource,
          id: ids[0],
        })
      );
    }
  }
}

export { NotFoundError };
