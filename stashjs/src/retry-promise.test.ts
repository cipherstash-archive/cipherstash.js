import { retryPromise } from "./retry-promise";

describe("retryPromise", () => {
  it("should return the inner value if it succeeds", () => {
    expect(retryPromise(async () => 10, { retryOn: () => true })).resolves.toBe(
      10
    );
  });

  it("should reject with the error if it can't be retried", () => {
    expect(
      retryPromise(
        async () => {
          throw new Error("Uh oh!");
        },
        { retryOn: () => false }
      )
    ).rejects.toEqual(new Error("Uh oh!"));
  });

  it("should keep retrying until it reaches max attempts", async () => {
    let count = 0;

    await expect(
      retryPromise(
        async () => {
          count++;
          throw new Error("Uh oh!");
        },
        { maxBackoffMs: 10, maxRetryCount: 5, retryOn: () => true }
      )
    ).rejects.toEqual(new Error("Uh oh!"));

    // One initial run plus five retries
    expect(count).toEqual(6);
  });

  it("should retry until it resolves", async () => {
    let count = 0;

    await expect(
      retryPromise(
        async () => {
          count++;

          if (count == 4) {
            return "yay";
          }

          throw new Error("Uh oh!");
        },
        { maxRetryCount: 5, retryOn: () => true }
      )
    ).resolves.toEqual("yay");
  });

  it("should retry until the retryOn predicate returns false", async () => {
    let count = 0;

    await expect(
      retryPromise(
        async () => {
          count++;

          if (count == 4) {
            throw new Error("Don't retry");
          }

          throw new Error("retry");
        },
        {
          maxRetryCount: 5,
          maxBackoffMs: 10,
          retryOn: (e) => e instanceof Error && e.message === "retry",
        }
      )
    ).rejects.toEqual(new Error("Don't retry"));
  });
});
