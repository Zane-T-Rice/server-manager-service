import { formatMessage } from "../../src/utils";

describe("formatMessage", () => {
  it("should replace parameters", () => {
    expect(formatMessage("this test is {test}.", { test: "cool" })).toEqual(
      "this test is cool."
    );
  });

  it("should handle extra keys in parameters", () => {
    expect(
      formatMessage("this test is {test}.", {
        test: "cool",
        extra: "very cool",
      })
    ).toEqual("this test is cool.");
  });

  it("should handle missing keys in parameters", () => {
    expect(
      formatMessage("this test is {test}.", { extra: "very cool" })
    ).toEqual("this test is {test}.");
  });
});
