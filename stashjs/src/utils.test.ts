import { normalizeId, maybeGenerateId, describeError } from "./utils";
import { ErrorTag, StashJSError } from "./errors";

describe("utils", () => {
  it(`idToBuffer and maybeGenerateId are mutually consistent`, () => {
    const uuidString = "aa85cde5-0bde-47a8-b1a6-b74bffbfde0d";
    const obj = { id: uuidString, foo: 123 };
    const objWithId = maybeGenerateId(obj);
    const otherId = normalizeId(uuidString);
    expect(objWithId.id).toEqual(otherId);
  });

  function createError(
    error: StashJSError<ErrorTag, unknown>
  ): StashJSError<ErrorTag, unknown> {
    return error;
  }

  describe("describeError", () => {
    it("should describe a stashjs error", () => {
      expect(
        describeError(
          createError({
            tag: "PlainError",
            caller: {
              function: "testFunction",
              line: 1,
              column: 1,
              module: "Test",
            },
            message: "An error happened",
          })
        )
      ).toEqual("An error happened (testFunction in Test:1)");

      expect(
        describeError(
          createError({
            tag: "IOError",
            cause: createError({
              tag: "PlainError",
              message: "Another error happened",
              caller: {
                function: "testFunction",
                line: 1,
                column: 1,
                module: "Test",
              },
            }),
            message: "An error happened",
            caller: {
              function: "testFunction",
              line: 1,
              column: 1,
              module: "Test",
            },
          })
        )
      ).toEqual(
        [
          "[IOError] Error occurred reading or writing to the filesystem or the network (testFunction in Test:1) (An error happened)",
          "  └ Another error happened (testFunction in Test:1)",
        ].join("\n")
      );
    });

    it("should describe a normal error", () => {
      function createError() {
        return new Error("Uh oh!");
      }

      expect(describeError(createError())).toContain(
        "Error: Uh oh!\n    at createError"
      );
    });

    it("should describe a normal object", () => {
      expect(describeError({ name: "test" })).toEqual('{"name":"test"}');
    });

    it("should describe a class", () => {
      expect(describeError(new Promise(() => {}))).toEqual("[object Promise]");
    });
  });
});
