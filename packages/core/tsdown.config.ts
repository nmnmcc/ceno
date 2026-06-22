import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/internal/index.ts", "src/*.ts"],
  format: "esm",
  dts: true,
  clean: true,
  exports: { devExports: true },
});
