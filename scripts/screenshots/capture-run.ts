// Runs the real AltPadi search against live Jumia and saves the result for screenshots.
// Run: npx vite-node scripts/screenshots/capture-run.ts "<jumia product url or search words>"
import { writeFileSync } from "node:fs";
import { runAlternativeSearch } from "@core/search-runner";
import { fetchCurrentProductFromUrl } from "@extension/currentProduct";
import { jumiaNgAdapter } from "@marketplaces/jumia-ng/adapter";

const input = process.argv[2] ?? "samsung galaxy a16";

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Jumia answers rapid requests with HTTP 429, so pace them and back off when told to. */
async function fetchText(url: string, attempt = 1): Promise<string> {
  await pause(800);
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" } });
  if (response.status === 429 && attempt < 4) {
    await pause(4000 * attempt);
    return fetchText(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function productUrl(): Promise<string> {
  if (input.startsWith("https://")) return input;
  const searchUrl = `https://www.jumia.com.ng/catalog/?q=${encodeURIComponent(input)}`;
  const [first] = jumiaNgAdapter.parseSearchResults(await fetchText(searchUrl), searchUrl);
  if (!first) throw new Error(`No Jumia results for "${input}"`);
  return first.url;
}

const url = await productUrl();
const product = await fetchCurrentProductFromUrl(url, jumiaNgAdapter, fetchText);
const run = await runAlternativeSearch(product, jumiaNgAdapter, {
  maxQueries: 5,
  maxSearchCandidates: 40,
  maxDetailFetches: 10,
  fetchText
});
writeFileSync("scripts/screenshots/run.json", JSON.stringify(run, null, 2));
const kinds = run.candidates.map((c) => c.match);
console.log(`errors: ${run.errors.length}. ${product.title} - ${run.candidates.length} candidates, same-item: ${kinds.filter((k) => k === "same-item").length}, sourceIsCheapest: ${run.summary?.sourceIsCheapest}`);
