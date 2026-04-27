import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  timeout: 30000,
  use: {
    trace: "on-first-retry"
  }
});
