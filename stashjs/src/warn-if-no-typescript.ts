import { doesProjectUseTypeScript } from "./typescript";

/**
 * Warn if TypeScript isn't used by the current project.
 *
 * This check can be disabled exporting `CS_SILENCE_TS_CHECK=yes`.
 */
export function warnIfNoTypeScript() {
  if (process.env["CS_SILENCE_TS_CHECK"] === "yes") {
    return;
  }

  if (doesProjectUseTypeScript()) {
    return;
  }

  console.warn(
    "Warning: it looks like you're running @cipherstash/stashjs in a project that doesn't use TypeScript.\n\n" +
      "@cipherstash/stashjs relies on certain TypeScript features to give you the best experience - without TypeScript you may experience runtime errors that could have been prevented.\n\n" +
      'To silence this warning either add "typescript" to your package.json dev dependencies, or export CS_SILENCE_TS_CHECK=yes as an environment variable.'
  );
}
