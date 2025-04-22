enum ErrorMessages {
  internalServerError = "Your request cannot be processed at this time. The server may be having a bad day.",
  notAuthorizedError = "Requester is not authorized.",
  singleNotFoundError = "The {resource} with id {id} was not found.",
  multipleNotFoundError = "The {resource}s with ids {ids} were not found.",
  proxyHostMismatch = "The host for server with id {serverId} is {serverHostUrl} which resolves to a real host, but does not exactly match the existing host's url {hostUrl}.",
  serverDoesNotHaveAHost = "The server with id {serverId} does not have a host configured.",
  hostDown = "The host {serverHostUrl} for server with id {serverId} appears to be down at this time.",
}

export { ErrorMessages };
