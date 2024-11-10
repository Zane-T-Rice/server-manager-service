import { InternalServerError, NotFoundError } from "../errors";
import { Prisma } from "@prisma/client";

function handleDatabaseErrors(err: Error, resource: string, ids: string[]) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.log("DA CODE BRUH", err.code);
    if (err.code === "P2025") {
      throw new NotFoundError(resource, ids);
    } else if (err.code === "P2003") {
      // A Foreign Key Constraint violation shouldn't happen unless the user is doing something wrong.
      // Usually they have given an incorrect server id or something similar.
      // Routes should verify the existence of the server before using user input as a Foreign Key.
      // Treating this as an InternalServerError unless someting better comes to mind.
    }
  }
  throw new InternalServerError();
}

export { handleDatabaseErrors };
