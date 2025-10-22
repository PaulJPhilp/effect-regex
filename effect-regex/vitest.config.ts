import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["./test/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [],
    globals: true,
    coverage: {
      provider: "v8",
    },
    env: {
      // Load environment variables from .env files
      // This allows tests to access process.env.ANTHROPIC_API_KEY
    },
    // Load .env files automatically
    envDir: ".",
  },
});
