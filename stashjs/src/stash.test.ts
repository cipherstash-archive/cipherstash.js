import { Stash } from "./stash";
import { vol } from "memfs";

function createMockProfile(workspace: string): string {
  return JSON.stringify({
    service: {
      workspace,
      host: "dev-local",
      port: 50001,
    },
    identityProvider: {
      kind: "Auth0-DeviceCode",
      host: "cipherstash-dev.au.auth0.com",
      clientId: "auth0-client-id",
    },
    keyManagement: {
      kind: "AWS-KMS",
      awsCredentials: {
        region: "ap-southeast-2",
        kind: "Federated",
        roleArn: "arn:aws:iam::123:role/cs-federated-cmk-access",
      },
      key: {
        arn: "arn:aws:kms:ap-southeast-2:123:key/456abc",
        namingKey: "test-naming-key",
        region: "ap-southeast-2",
      },
    },
  });
}

describe("Stash.loadProfile", () => {
  beforeEach(() => {
    vol.fromJSON({
      [`${process.env["HOME"]}/.cipherstash/config.json`]:
        '{ "defaultProfile": "default-profile" }',
      [`${process.env["HOME"]}/.cipherstash/default-profile/profile-config.json`]:
        createMockProfile("default-workspace"),
      [`${process.env["HOME"]}/.cipherstash/env-profile/profile-config.json`]:
        createMockProfile("env-workspace"),
      [`${process.env["HOME"]}/.cipherstash/by-name-profile/profile-config.json`]:
        createMockProfile("by-name-workspace"),
    });
  });

  afterEach(() => {
    delete process.env["CS_PROFILE_NAME"];
  });

  it("should load a profile from the passed in name", async () => {
    const profile = await Stash.loadProfile({
      profileName: "by-name-profile",
    });

    expect(profile.name).toEqual("by-name-profile");
    expect(profile.config.service.workspace).toEqual("by-name-workspace");
  });

  it("should load a profile from the passed in from the env", async () => {
    process.env["CS_PROFILE_NAME"] = "env-profile";

    const profile = await Stash.loadProfile();

    expect(profile.name).toEqual("env-profile");
    expect(profile.config.service.workspace).toEqual("env-workspace");
  });

  it("should load the default profile when nothing is passed in", async () => {
    const profile = await Stash.loadProfile();

    expect(profile.name).toEqual("default-profile");
    expect(profile.config.service.workspace).toEqual("default-workspace");
  });
});
