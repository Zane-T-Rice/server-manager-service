import { Prisma } from "@prisma/client";
import { InternalServerError, NotFoundError } from "../errors";

function handleDatabaseErrors(err: any, resource: string, ids: string[]) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      throw new NotFoundError(resource, [ids[0]]);
    }
  }
  throw new InternalServerError();
}

export { handleDatabaseErrors };
