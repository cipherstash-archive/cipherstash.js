import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { logger } from './logger';

const MAX_DIRECTORY_POPS = 5;

/**
 * Test to see whether the currently running script is from a project that contains TypeScript.
 *
 * For example, in the following repo layout if script.js calls this method it will return true.
 *
 * ```txt
 * /monorepo
 *   /apps
 *     /my-app
 *       /bin
 *         script.js
 *   package.json (containing typescript in devDeps or deps)
 * ```
 *
 * Note: this method uses blocking IO
 */
export function doesProjectUseTypeScript(): boolean {
  // process.argv always seems to start with "node" even when:
  // - it's executed using shebang
  // - it's executed using a command like time
  const [, runningFile] = process.argv;

  if (!runningFile) {
    return false;
  }

  let directoryToTest = dirname(runningFile);

  try {
    for (let i = 0; i < MAX_DIRECTORY_POPS; i++) {
      const packagePath = resolve(directoryToTest, "package.json");

      if (existsSync(packagePath)) {
        const packageJson = JSON.parse(readFileSync(packagePath).toString());

        if (
          !!packageJson?.devDependencies?.typescript ||
          !!packageJson?.dependencies?.typescript
        ) {
          return true;
        }
      }

      directoryToTest = resolve(directoryToTest, "..");
    }
  } catch (error) {
    logger.warn(
      "Failed to determine whether project is using TypeScript. Defaulting to false.",
      { error }
    );
  }

  return false;
}
