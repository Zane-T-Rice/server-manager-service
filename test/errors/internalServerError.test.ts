import { InternalServerError } from "../../src/errors";
import { ErrorMessageNames, ErrorMessages } from "../../src/constants";

describe("InternalServerError", () => {
  const customMessage = "Custom error message";

  it(`should have the name ${ErrorMessageNames.internalServerError}`, () => {
    const internalServerError = new InternalServerError();
    expect(internalServerError.name).toEqual(
      ErrorMessageNames.internalServerError
    );
  });

  it(`should have the message ${ErrorMessages.internalServerError}`, () => {
    const internalServerError = new InternalServerError();
    expect(internalServerError.message).toEqual(
      ErrorMessages.internalServerError
    );
  });

  it(`should have the custom message ${customMessage}`, () => {
    const internalServerError = new InternalServerError(customMessage);
    expect(internalServerError.message).toEqual(customMessage);
  });
});
