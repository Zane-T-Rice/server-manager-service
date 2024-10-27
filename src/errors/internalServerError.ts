class InternalServerError implements Error {
  name = "InternalServerError";
  message =
    "Your request cannot be processed at this time. The server may be having a bad day. You may want to let the maintainer of the server know.";

  constructor() {}
}

export { InternalServerError };
