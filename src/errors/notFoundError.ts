class NotFoundError implements Error {
  name: string = "NotFoundError";
  message: string = "";

  constructor(resource: string, ids: string[]) {
    if (ids.length > 1) {
      this.message = `The ${resource} with ids ${ids} were not found.`;
    } else {
      this.message = `The ${resource} with id ${ids[0]} was not found.`;
    }
  }
}

export { NotFoundError };
