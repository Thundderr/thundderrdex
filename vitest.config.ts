import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      // Mirror tsconfig's "@/*" -> "./src/*" so tests can import the same way
      // application code does.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
