import { BadRequestError, InternalServerError, NotFoundError } from "../errors";
import { Prisma } from "@prisma/client";

function handleDatabaseErrors(
  err: Error,
  resource: string,
  ids: string[]
): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      throw new NotFoundError(resource, ids);
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    const message = err.message.match(/Argument `.*` is missing./)?.[0];
    if (message) throw new BadRequestError(message);
  }
  throw new InternalServerError();
}

export { handleDatabaseErrors };
