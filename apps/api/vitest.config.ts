import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts", "test/**/*.e2e-spec.ts"],
    root: "./",
  },
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }),
  ],
});
