import { chromium, expect, test } from "@playwright/test";
import path from "node:path";

test("loads the built extension service worker", async () => {
  const extensionPath = path.resolve("dist");
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
  });

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) {
      worker = await context.waitForEvent("serviceworker");
    }

    expect(worker.url()).toContain("chrome-extension://");
  } finally {
    await context.close();
  }
});
