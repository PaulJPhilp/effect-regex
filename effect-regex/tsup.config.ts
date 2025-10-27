import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/bin.ts", "src/mcp/server.ts"],
  clean: true,
  publicDir: true,
  treeshake: "smallest",
  external: ["@parcel/watcher"],
});
