import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts", "test/**/*.e2e-spec.ts"],
    root: "./",
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    dangerouslyIgnoreUnhandledErrors: true,
  },
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }),
  ],
});
