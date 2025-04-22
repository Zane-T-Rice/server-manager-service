import { BadRequestError } from "../../src/errors";
import { ErrorMessageNames } from "../../src/constants";

describe("InternalServerError", () => {
  const customMessage = "Custom error message";

  it(`should have the name ${ErrorMessageNames.badRequestError}`, () => {
    const internalServerError = new BadRequestError(customMessage);
    expect(internalServerError.name).toEqual(ErrorMessageNames.badRequestError);
  });

  it(`should have the custom message ${customMessage}`, () => {
    const internalServerError = new BadRequestError(customMessage);
    expect(internalServerError.message).toEqual(customMessage);
  });
});
