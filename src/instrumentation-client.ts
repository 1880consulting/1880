/**
 * Runs in the browser before the app starts.
 *
 * zod (form checks) tests whether it may compile code at runtime with
 * `Function("")`. The Content Security Policy forbids that, so the browser
 * logs a violation on every page. Telling zod up front skips the test. It
 * reads this setting from a global, so zod itself isn't loaded here.
 */
const g = globalThis as { __zod_globalConfig?: { jitless?: boolean } };
g.__zod_globalConfig = { ...g.__zod_globalConfig, jitless: true };
