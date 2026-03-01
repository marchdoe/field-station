/// <reference types="vitest/config" />

import { fileURLToPath, URL } from "node:url";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [viteReact()],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/lib/api-types.ts", "src/routeTree.gen.ts"],
      thresholds: {
        lines: 20,
        functions: 20,
        branches: 15,
      },
    },
  },
});
