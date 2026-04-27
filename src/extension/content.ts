import { parseProductPage } from "@marketplaces/jumia-ng/parser";
import type { ExtensionRequest, ExtensionResponse } from "@extension/messages";

chrome.runtime.onMessage.addListener(
  (message: ExtensionRequest, _sender, sendResponse: (response: ExtensionResponse) => void) => {
    if (message.type !== "EXTRACT_CURRENT_PRODUCT") return false;

    try {
      const product = parseProductPage(document.documentElement.outerHTML, location.href);
      sendResponse({ ok: true, product: { ...product, source: "page" } });
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    }

    return false;
  }
);
