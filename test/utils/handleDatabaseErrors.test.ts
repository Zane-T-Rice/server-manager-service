import { handleDatabaseErrors } from "../../src/utils";
import { InternalServerError, NotFoundError } from "../../src/errors";
import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

describe("handleDatabaseErrors", () => {
  const resource = "server";
  const ids = ["id"];

  it("throws NotFoundError for Prisma code P2025", () => {
    expect(() =>
      handleDatabaseErrors(
        new PrismaClientKnownRequestError("Server Not Found", {
          code: "P2025",
          clientVersion: "version",
        }),
        resource,
        ids
      )
    ).toThrow(new NotFoundError(resource, ids));
  });

  it("throws InternalServerError for other Prisma codes", () => {
    expect(() =>
      handleDatabaseErrors(
        { code: "P2037" } as Prisma.PrismaClientKnownRequestError,
        resource,
        ids
      )
    ).toThrow(new InternalServerError());
  });

  it("throws InternalServerError for errors that are not Prisma errors", async () => {
    expect(() => handleDatabaseErrors(new Error(), resource, ids)).toThrow(
      new InternalServerError()
    );
  });
});
