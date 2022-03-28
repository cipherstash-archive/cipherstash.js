import { sign } from "jws";
import { Ok } from "../result";
import { validateAccessToken } from "./access-token";

interface Token {
  "https://aws.amazon.com/tags"?: {
    principal_tags?: {
      workspace?: unknown[];
    };
  };
  scope?: string;
}

function createToken(token: Token): string {
  return sign({
    header: {
      alg: "HS256",
      typ: "JWT",
    },
    secret: "secret",
    payload: token,
  });
}

function errWithMessage(message: string): unknown {
  return {
    ok: false,
    tag: "Result.Err",
    error: expect.objectContaining({
      message,
    }),
  };
}

describe("validateAccessToken", () => {
  it("should fail to decode an invalid token", () => {
    expect(validateAccessToken("not-a-real-token", "")).toEqual(
      errWithMessage("Failed to decode token")
    );
  });

  it("should fail if token contains no scope", () => {
    expect(validateAccessToken(createToken({}), "")).toEqual(
      errWithMessage("Token scope was not a string")
    );
  });

  it("should fail if token does not have an expected scope", () => {
    expect(
      validateAccessToken(
        createToken({
          scope: "open-door close-door",
        }),
        "slam-door"
      )
    ).toEqual(errWithMessage("Token did not have expected scope: slam-door"));
  });

  it("should pass if token has a super set of expected scopes", () => {
    expect(
      validateAccessToken(
        createToken({
          scope: "open-door close-door slam-door",
        }),
        "slam-door"
      )
    ).toEqual(Ok());
  });

  it("should pass if token has scopes in different order", () => {
    expect(
      validateAccessToken(
        createToken({
          scope: "open-door close-door slam-door",
        }),
        "slam-door open-door close-door"
      )
    ).toEqual(Ok());
  });

  it("should pass if token has repeated scopes", () => {
    expect(
      validateAccessToken(
        createToken({
          scope: "slam-door open-door slam-door close-door slam-door",
        }),
        "slam-door open-door close-door"
      )
    ).toEqual(Ok());
  });

  it("should pass if token has no scopes", () => {
    expect(
      validateAccessToken(
        createToken({
          scope: "slam-door open-door slam-door close-door slam-door",
        }),
        "   "
      )
    ).toEqual(Ok());
  });

  it("should fail if token doesn't include principal tags when using workspace", () => {
    expect(
      validateAccessToken(
        createToken({
          scope: "ws:my-workspace",
        }),
        "",
        "my-workspace"
      )
    ).toEqual(
      errWithMessage(
        'Token field "https://aws.amazon.com/tags" was not an object'
      )
    );
  });

  it("should fail if principal tags don't include workspace", () => {
    expect(
      validateAccessToken(
        createToken({
          "https://aws.amazon.com/tags": {
            principal_tags: {
              workspace: [],
            },
          },
          scope: "ws:my-workspace",
        }),
        "",
        "my-workspace"
      )
    ).toEqual(
      errWithMessage(
        "Principal tags did not include workspace tag: ws:my-workspace"
      )
    );
  });

  it("should fail if token scope does node include workspace", () => {
    expect(
      validateAccessToken(
        createToken({
          "https://aws.amazon.com/tags": {
            principal_tags: {
              workspace: ["ws:my-workspace"],
            },
          },
          scope: "collection.delete collection.create",
        }),
        "collection.create collection.delete",
        "my-workspace"
      )
    ).toEqual(
      errWithMessage(
        "Token scope did not include workspace tag: ws:my-workspace"
      )
    );
  });

  it("should pass if token is well formed", () => {
    expect(
      validateAccessToken(
        createToken({
          "https://aws.amazon.com/tags": {
            principal_tags: {
              workspace: ["ws:my-workspace"],
            },
          },
          scope: "collection.delete collection.create ws:my-workspace",
        }),
        "collection.create collection.delete",
        "my-workspace"
      )
    ).toEqual(Ok());
  });

  it("should work on a token provided by production", () => {
    const token =
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IklWeG1WaThjUXdxNnJDZDVSM3NTZCJ9.eyJodHRwczovL2F3cy5hbWF6b24uY29tL3RhZ3MiOnsicHJpbmNpcGFsX3RhZ3MiOnsid29ya3NwYWNlIjpbIndzOjNNNkU3Q05OQlk2TzNKUSJdfX0sImlzcyI6Imh0dHBzOi8vYXV0aC5jaXBoZXJzdGFzaC5jb20vIiwic3ViIjoiYXV0aDB8NjIzOTAwOWQ3MjJiMDYwMDcwOTEyYjM0IiwiYXVkIjoiYXAtc291dGhlYXN0LTIuYXdzLnN0YXNoZGF0YS5uZXQiLCJpYXQiOjE2NDg0MjUzOTQsImV4cCI6MTY0ODUxMTc5NCwiYXpwIjoiQ3RZOUROR29uZ29TdlphQXdiYjZzdzBIcjdHbDdwZzciLCJzY29wZSI6ImNvbGxlY3Rpb24uY3JlYXRlIGNvbGxlY3Rpb24uZGVsZXRlIGNvbGxlY3Rpb24uaW5mbyBjb2xsZWN0aW9uLmxpc3QgZG9jdW1lbnQucHV0IGRvY3VtZW50LmRlbGV0ZSBkb2N1bWVudC5nZXQgZG9jdW1lbnQucXVlcnkgd3M6M002RTdDTk5CWTZPM0pRIG9mZmxpbmVfYWNjZXNzIn0.nCm64P4PkvP3scZcwfi4uBvu3Iyh6dlBGiMVr5af1EqViVG68bkBDEPW5BdGTXbBbPHVEh0gjriWEnz8utXVSIUNHfrbzYyLjicnOwRVcXsVGAs3U1vM30v7PNo6G3i0LTz_ZYuAeiC0yf83lhaWfGiPUj_kqtCOzGtfgWa2EqHVtGfdjptwvNfZnc4hYuT77kizbR7lLNGGTigSLOO0-tAYEMYwC6WZdgyMghTnEnpofO3ZAMfsmP2CPqXbSkwtOMmrIfF99w7QXjUACUxsRA-HEu8zUtteaxCx4ZnXPvu-iw_Te332Y_tmCERfJoK0Qy7U9xmZGNXeT3h89ZgZoQ";

    const scopes = [
      "collection.create",
      "collection.delete",
      "collection.info",
      "collection.list",
      "document.put",
      "document.delete",
      "document.get",
      "document.query",
      "ws:3M6E7CNNBY6O3JQ",
      "offline_access",
    ].join(" ");

    const workspace = "3M6E7CNNBY6O3JQ";

    expect(validateAccessToken(token, scopes, workspace)).toEqual(Ok());
  });
});
