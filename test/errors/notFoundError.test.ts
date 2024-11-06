import { NotFoundError } from "../../src/errors";
import { ErrorMessageNames } from "../../src/constants";

describe("NotFoundError", () => {
  it(`should have the name ${ErrorMessageNames.notFoundError}`, () => {
    const notFoundError = new NotFoundError("not found", ["id1"]);
    expect(notFoundError.name).toEqual(ErrorMessageNames.notFoundError);
  });

  it.each([
    {
      testDescription: "NotFoundError with no ids", // Shouldn't happen really, but at least don't crash.
      resource: "server",
      ids: [],
      message: "The server with id {id} was not found.",
    },
    {
      testDescription: "NotFoundError with one id",
      resource: "server",
      ids: ["id1"],
      message: "The server with id id1 was not found.",
    },
    {
      testDescription: "NotFoundError with two ids",
      resource: "server",
      ids: ["id1", "id2"],
      message: "The servers with ids id1,id2 were not found.",
    },
    {
      testDescription: "NotFoundError with three ids",
      resource: "server",
      ids: ["id1", "id2", "id3"],
      message: "The servers with ids id1,id2,id3 were not found.",
    },
  ])(`$testDescription`, ({ resource, ids, message }) => {
    const notFoundError = new NotFoundError(resource, ids);
    expect(notFoundError.message).toEqual(message);
  });
});
