import { vol } from "memfs";
import { doesProjectUseTypeScript } from "./typescript";

describe("doesProjectUseTypeScript", () => {
  let initialArgv: string[];

  beforeEach(() => {
    initialArgv = process.argv;

    vol.reset();
  });

  afterEach(() => {
    process.argv = initialArgv;
  });

  it("should get a package.json from the same directory", () => {
    process.argv = ["node", "/exec-dir/dist/test.js"];

    vol.fromJSON({
      "/exec-dir/dist/test.js": "// current executing file",
      "/exec-dir/dist/package.json": JSON.stringify({
        name: "my-package",
        dependencies: {
          typescript: "1.0.0",
        },
      }),
    });

    expect(doesProjectUseTypeScript()).toBe(true);
  });

  it("should follow a symlink", () => {
    process.argv = ["node", "/my-script"];

    vol.fromJSON({
      "/exec-dir/dist/test.js": "// current executing file",
      "/exec-dir/dist/package.json": JSON.stringify({
        name: "my-package",
        dependencies: {
          typescript: "1.0.0",
        },
      }),
    });

    vol.symlinkSync("/exec-dir/dist/test.js", "/my-script");

    expect(doesProjectUseTypeScript()).toBe(true);
  });

  it("should get a package.json from a directory up", () => {
    process.argv = ["node", "/exec-dir/dist/test.js"];

    vol.fromJSON({
      "/exec-dir/dist/test.js": "// current executing file",
      "/exec-dir/package.json": JSON.stringify({
        name: "my-package",
        dependencies: {
          typescript: "1.0.0",
        },
      }),
    });

    expect(doesProjectUseTypeScript()).toBe(true);
  });

  it("should get typescript from dev dependencies", () => {
    process.argv = ["node", "/exec-dir/dist/test.js"];

    vol.fromJSON({
      "/exec-dir/dist/test.js": "// current executing file",
      "/exec-dir/package.json": JSON.stringify({
        name: "my-package",
        devDependencies: {
          typescript: "1.0.0",
        },
      }),
    });

    expect(doesProjectUseTypeScript()).toBe(true);
  });

  it("should fail if package.json is too far up", () => {
    process.argv = [
      "node",
      "/exec-dir/dist/first/second/third/fourth/fifth/sixth/test.js",
    ];

    vol.fromJSON({
      "/exec-dir/dist/first/second/third/fourth/fifth/sixth/test.js":
        "// current executing file",
      "/exec-dir/package.json": JSON.stringify({
        name: "my-package",
        dependencies: {
          typescript: "1.0.0",
        },
      }),
    });

    expect(doesProjectUseTypeScript()).toBe(false);
  });

  it("should fail if there is no package json", () => {
    process.argv = ["node", "/exec-dir/dist/test.js"];

    vol.fromJSON({
      "/exec-dir/dist/test.js": "// current executing file",
    });

    expect(doesProjectUseTypeScript()).toBe(false);
  });
});
