import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["./test/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [],
    globals: true,
    coverage: {
      provider: "v8",
      exclude: [
        "src/**/*.d.ts",
        "src/**/index.ts", // Re-export files
        "src/errors/types.ts", // Error class definitions (tested but not tracked by v8)
        "src/bin.ts", // CLI entry point (tested via integration)
        "src/mcp/server.ts", // MCP server (tested via E2E)
        "src/mcp/schemas.ts", // Schema constants
      ],
      reporter: ["text", "json", "html"],
    },
    env: {
      // Load environment variables from .env files
      // This allows tests to access process.env.ANTHROPIC_API_KEY
    },
  },
});
