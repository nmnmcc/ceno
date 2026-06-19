import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["packages/*/test/**/*.test.ts", "references/couchdb-nano/test/integration/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 15_000,
    sequence: { concurrent: true },
    fakeTimers: { toFake: undefined },
  },
});
