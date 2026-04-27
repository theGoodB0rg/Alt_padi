import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"]
  },
  resolve: {
    alias: {
      "@core": "/src/core",
      "@extension": "/src/extension",
      "@marketplaces": "/src/marketplaces",
      "@ui": "/src/ui",
      "@test": "/src/test"
    }
  }
});
