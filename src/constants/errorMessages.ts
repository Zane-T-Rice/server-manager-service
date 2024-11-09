enum ErrorMessages {
  internalServerError = "Your request cannot be processed at this time. The server may be having a bad day.",
  notAuthorizedError = "Requester is not authorized.",
  singleNotFoundError = "The {resource} with id {id} was not found.",
  multipleNotFoundError = "The {resource}s with ids {ids} were not found.",
}

export { ErrorMessages };
