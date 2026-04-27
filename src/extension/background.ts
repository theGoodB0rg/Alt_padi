import { runAlternativeSearch } from "@core/search-runner";
import type { ProductSnapshot } from "@core/types";
import type { ExtensionRequest, ExtensionResponse } from "@extension/messages";
import { jumiaNgAdapter } from "@marketplaces/jumia-ng/adapter";

const LIMITS = {
  maxQueries: 4,
  maxSearchCandidates: 20,
  maxDetailFetches: 8
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
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id || !tab.url?.startsWith("https://www.jumia.com.ng/")) {
    throw new Error("Open a Jumia Nigeria product page before searching.");
  }

  const extracted = await chrome.tabs.sendMessage<ExtensionRequest, ExtensionResponse>(tab.id, {
    type: "EXTRACT_CURRENT_PRODUCT"
  });
  if (!extracted.ok || !("product" in extracted)) {
    throw new Error(extracted.ok ? "Product extraction failed." : extracted.error);
  }

  return runAlternativeSearch(extracted.product as ProductSnapshot, jumiaNgAdapter, {
    ...LIMITS,
    fetchText: fetchTextWithCache
  });
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
      headers: {
        "User-Agent": "JumiaAlternativesExtension/0.1 user-triggered comparison"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    await chrome.storage.local.set({
      [cacheKey]: {
        html,
        expiresAt: Date.now() + ttlFor(url)
      }
    });
    return html;
  } finally {
    clearTimeout(timeout);
  }
}

function ttlFor(url: string): number {
  return url.includes("/catalog/") ? 10 * 60 * 1000 : 6 * 60 * 60 * 1000;
}
