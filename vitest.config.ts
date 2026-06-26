import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import path from "path";
config({ path: ".env.local" });
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // server-only is a Next.js guard — no-op in vitest/Node
      "server-only": path.resolve(__dirname, "./src/__mocks__/server-only.ts"),
    },
  },
  test: { environment: "node" },
});
