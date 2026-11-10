import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside Next's server build; tests run on the server anyway.
      "server-only": fileURLToPath(new URL("./src/test/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Tests get their own database (created by scripts/mysql-init.sql) and
    // migrate it first, so `npm test` never touches your local data.
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? "mysql://studio:studio@127.0.0.1:3306/studio_test",
    },
    globalSetup: ["./src/test/migrate.ts"],
    // Database tests share one MySQL, so files run one at a time.
    fileParallelism: false,
  },
});
