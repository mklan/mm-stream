import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    environmentOptions: {
      localStorage: null,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.d.ts",
        "src/types/**",
        "**/*.test.ts",
      ],
    },
    include: ["src/**/*.test.ts"],
  },
});
