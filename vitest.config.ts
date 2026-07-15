import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // The postgres client connects lazily, so a placeholder URL is enough
    // to satisfy src/db/client.ts's startup check without a real database.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
