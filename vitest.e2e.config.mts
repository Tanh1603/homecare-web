import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": projectRoot },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/e2e/**/*.e2e.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**", "e2e/**"],
    maxWorkers: 1,
  },
});
