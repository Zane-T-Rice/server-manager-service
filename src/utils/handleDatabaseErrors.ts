import { InternalServerError, NotFoundError } from "../errors";
import { Prisma } from "@prisma/client";

function handleDatabaseErrors(err: Error, resource: string, ids: string[]) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      throw new NotFoundError(resource, ids);
    }
  }
  throw new InternalServerError();
}

export { handleDatabaseErrors };
