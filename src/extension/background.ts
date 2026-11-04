import { runAlternativeSearch } from "@core/search-runner";
import { fetchCurrentProductFromUrl } from "@extension/currentProduct";
import type { SearchProgress } from "@core/types";
import type { ExtensionRequest, ExtensionResponse, SearchProgressEvent } from "@extension/messages";
import { jumiaNgAdapter } from "@marketplaces/jumia-ng/adapter";

const LIMITS = {
  maxQueries: 5,
  maxSearchCandidates: 40,
  maxDetailFetches: 10
};

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener(
  (message: ExtensionRequest, _sender, sendResponse: (response: ExtensionResponse) => void) => {
    if (message.type !== "RUN_ALTERNATIVE_SEARCH") return false;

    void handleSearch()
      .then((run) => sendResponse({ ok: true, run }))
      .catch((error) =>
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      );

    return true;
  }
);

async function handleSearch() {
  reportProgress({ stage: "reading" });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id || !tab.url?.startsWith("https://www.jumia.com.ng/")) {
    throw new Error("Open a Jumia Nigeria product page before searching.");
  }

  const product = await fetchCurrentProductFromUrl(tab.url, jumiaNgAdapter, fetchTextWithCache);

  return runAlternativeSearch(product, jumiaNgAdapter, {
    ...LIMITS,
    fetchText: fetchTextWithCache,
    onProgress: reportProgress
  });
}

function reportProgress(progress: SearchProgress): void {
  const event: SearchProgressEvent = { type: "SEARCH_PROGRESS", progress };
  // Progress is cosmetic: a closed side panel (no receiver) must not fail the search.
  chrome.runtime.sendMessage(event).catch(() => {});
}

async function fetchTextWithCache(url: string): Promise<string> {
  const cacheKey = `fetch:${url}`;
  const cached = await chrome.storage.local.get(cacheKey);
  const value = cached[cacheKey] as { html: string; expiresAt: number } | undefined;
  if (value && value.expiresAt > Date.now()) return value.html;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: "include",
      headers: {
        Accept: "text/html,application/xhtml+xml"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    await cacheWrite(cacheKey, { html, expiresAt: Date.now() + ttlFor(url) });
    return html;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * The cache is an optimisation: a full storage quota must never fail a search.
 * On quota errors, drop expired entries (then the oldest half) and retry once.
 */
async function cacheWrite(key: string, value: { html: string; expiresAt: number }): Promise<void> {
  try {
    await chrome.storage.local.set({ [key]: value });
    return;
  } catch {
    await pruneFetchCache();
  }
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch {
    // Still full: skip caching this page.
  }
}

async function pruneFetchCache(): Promise<void> {
  const all = (await chrome.storage.local.get(null)) as Record<string, { expiresAt?: number }>;
  const entries = Object.entries(all).filter(([key]) => key.startsWith("fetch:"));
  const now = Date.now();
  const expired = entries.filter(([, value]) => (value.expiresAt ?? 0) <= now).map(([key]) => key);
  const live = entries
    .filter(([, value]) => (value.expiresAt ?? 0) > now)
    .sort(([, a], [, b]) => (a.expiresAt ?? 0) - (b.expiresAt ?? 0))
    .map(([key]) => key);
  await chrome.storage.local.remove([...expired, ...live.slice(0, Math.ceil(live.length / 2))]);
}

function ttlFor(url: string): number {
  // Search pages (any "?q=", including category-scoped ones) go stale fast; product pages less so.
  return url.includes("?q=") ? 10 * 60 * 1000 : 6 * 60 * 60 * 1000;
}
