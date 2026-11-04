// Renders the AltPadi icon (the side panel's green tag logo) to the PNG sizes Chrome uses.
// Run: node scripts/build-icons.mjs   (uses the installed Chrome via Playwright)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve("public/icons");

// Small icons get a bigger, bolder glyph so the tag still reads at 16px.
const SIZES = [
  { size: 16, glyph: 0.74, stroke: 2.9, radius: 0.24 },
  { size: 32, glyph: 0.64, stroke: 2.5, radius: 0.24 },
  { size: 48, glyph: 0.58, stroke: 2.3, radius: 0.24 },
  { size: 128, glyph: 0.5, stroke: 2, radius: 0.23 }
];

function iconSvg({ size, glyph, stroke, radius }) {
  const box = size * glyph;
  const scale = box / 20; // the tag spans 20 of its 24 units
  const offset = (size - box) / 2 - 2 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#17936c"/>
      <stop offset="1" stop-color="#0a4634"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/>
      <stop offset=".5" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * radius}" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" rx="${size * radius}" fill="url(#shine)"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="#fff"
     stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/>
    <circle cx="7.5" cy="7.5" r="1.4" fill="#fff" stroke="none"/>
  </g>
</svg>`;
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const spec of SIZES) {
    const page = await browser.newPage({ viewport: { width: spec.size, height: spec.size } });
    await page.setContent(`<html><body style="margin:0;background:transparent">${iconSvg(spec)}</body></html>`);
    await page.locator("svg").screenshot({ path: path.join(OUT, `icon-${spec.size}.png`), omitBackground: true });
    await page.close();
  }
} finally {
  await browser.close();
}
