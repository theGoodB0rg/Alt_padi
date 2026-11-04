// Photographs the preview at side-panel width. Needs `npx vite --port 5199` running.
// Run: node scripts/screenshots/shoot.mjs [outDir]
import { chromium } from "@playwright/test";

const OUT = process.argv[2] ?? "docs/screenshots";
const URL = "http://localhost:5199/scripts/screenshots/preview.html";
const SHOTS = [
  { name: "start", mode: "idle", scheme: "light" },
  { name: "searching", mode: "loading", scheme: "light" },
  { name: "results", mode: "done", scheme: "light" },
  { name: "results-dark", mode: "done", scheme: "dark" }
];

const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const shot of SHOTS) {
    const page = await browser.newPage({ viewport: { width: 400, height: 860 }, colorScheme: shot.scheme, deviceScaleFactor: 2 });
    await page.goto(`${URL}?mode=${shot.mode}`);
    await page.waitForSelector(".panel");
    if (shot.mode !== "idle") await page.click("text=Check prices");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500); // let entrance animations and the count-up settle
    await page.screenshot({ path: `${OUT}/${shot.name}.png` });
    await page.close();
  }
} finally {
  await browser.close();
}
