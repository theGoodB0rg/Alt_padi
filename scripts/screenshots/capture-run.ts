// Runs the real AltPadi search against live Jumia and saves the result for screenshots.
// Run: npx vite-node scripts/screenshots/capture-run.ts "<jumia product url or search words>"
//
// Set ALTPADI_CDP to your Chrome's debugging URL (e.g. ws://127.0.0.1:9222/devtools/browser) and
// ALTPADI_SESSION to an agent-browser session pinned to an open jumia.com.ng tab, and requests go
// through that tab, as the extension's would. Otherwise Node fetches directly.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { runAlternativeSearch } from "@core/search-runner";
import { fetchCurrentProductFromUrl } from "@extension/currentProduct";
import { jumiaNgAdapter } from "@marketplaces/jumia-ng/adapter";

const input = process.argv[2] ?? "samsung galaxy a16";

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Page {
  status: number;
  body: string;
}

const cdp = process.env.ALTPADI_CDP;
const session = process.env.ALTPADI_SESSION;

async function fetchDirect(url: string): Promise<Page> {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" } });
  return { status: response.status, body: await response.text() };
}

function fetchInBrowserTab(url: string): Page {
  const source = `fetch(${JSON.stringify(url)}).then(async (r) => JSON.stringify({ status: r.status, body: await r.text() }))`;
  // agent-browser is a .cmd shim on Windows; base64 keeps quotes and spaces away from the shell.
  const script = `eval(atob('${Buffer.from(source).toString("base64")}'))`;
  const output = execFileSync(
    "agent-browser",
    ["--cdp", cdp!, "--session", session!, "--pin-tab", "eval", script],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, shell: process.platform === "win32" }
  );
  return JSON.parse(JSON.parse(output.trim())) as Page;
}

/** Jumia answers rapid requests with HTTP 429, so pace them and back off when told to. */
async function fetchText(url: string, attempt = 1): Promise<string> {
  await pause(1500);
  const page = cdp && session ? fetchInBrowserTab(url) : await fetchDirect(url);
  if (page.status === 429 && attempt < 4) {
    await pause(5000 * attempt);
    return fetchText(url, attempt + 1);
  }
  if (page.status >= 400) throw new Error(`HTTP ${page.status}`);
  return page.body;
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
