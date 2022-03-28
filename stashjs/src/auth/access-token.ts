import { Result, Ok, Err } from "../result";
import { decode } from "jws";
import { TokenValidationFailure } from "../errors";
import { isObject } from "../guards";

/**
 * Check whether an access token is valid for a certain set of scopes and workspace
 */
export function validateAccessToken(
  token: string,
  expectedScope: string,
  workspace?: string
): Result<void, TokenValidationFailure> {
  let payload: unknown;

  try {
    const signature = decode(token);
    payload = signature.payload;
  } catch (error) {
    return Err(TokenValidationFailure("Failed to decode token", error));
  }

  if (!payload) {
    return Err(TokenValidationFailure("Decoded token was not defined"));
  }

  if (!isObject(payload)) {
    return Err(TokenValidationFailure("Decoded token was not an object"));
  }

  if (typeof payload["scope"] !== "string") {
    return Err(TokenValidationFailure("Token scope was not a string"));
  }

  const scopes = new Set(payload["scope"].split(/\s+/));

  for (const expected of expectedScope.split(/\s+/).filter((x) => !!x.trim())) {
    if (!scopes.has(expected)) {
      return Err(
        TokenValidationFailure(`Token did not have expected scope: ${expected}`)
      );
    }
  }

  if (workspace) {
    const amazonTags = payload["https://aws.amazon.com/tags"];

    if (!isObject(amazonTags)) {
      return Err(
        TokenValidationFailure(
          `Token field "https://aws.amazon.com/tags" was not an object`
        )
      );
    }

    const principalTags = amazonTags["principal_tags"];

    if (!isObject(principalTags)) {
      return Err(
        TokenValidationFailure(`Token field "principal_tags" was not an object`)
      );
    }

    const tags = principalTags["workspace"];

    if (!Array.isArray(tags)) {
      return Err(
        TokenValidationFailure(
          `Token principal_tags did not exist or was not an array`
        )
      );
    }

    const workspaceTag = `ws:${workspace}`;

    if (!tags.includes(workspaceTag)) {
      return Err(
        TokenValidationFailure(
          `Principal tags did not include workspace tag: ${workspaceTag}`
        )
      );
    }

    if (!scopes.has(workspaceTag)) {
      return Err(
        TokenValidationFailure(
          `Token scope did not include workspace tag: ${workspaceTag}`
        )
      );
    }
  }

  return Ok();
}
