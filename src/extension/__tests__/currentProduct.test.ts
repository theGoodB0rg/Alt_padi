import { describe, expect, it } from "vitest";

import { fetchCurrentProductFromUrl } from "@extension/currentProduct";
import type { MarketplaceAdapter } from "@marketplaces/adapter";

const adapter: MarketplaceAdapter = {
  id: "test-market",
  buildSearchRequests: () => [],
  parseSearchResults: () => [],
  parseProductDetails: (_html, url) => ({
    title: "Foldable Phone Stand",
    url,
    categoryPath: ["Phones", "Accessories"],
    specs: {},
    source: "detail"
  })
};

describe("fetchCurrentProductFromUrl", () => {
  it("fetches and parses the active Jumia product page without a content script", async () => {
    const url = "https://www.jumia.com.ng/generic-phone-stand-123.html";
    const fetchedUrls: string[] = [];

    const product = await fetchCurrentProductFromUrl(url, adapter, async (requestUrl) => {
      fetchedUrls.push(requestUrl);
      return "<html><h1>Foldable Phone Stand</h1></html>";
    });

    expect(fetchedUrls).toEqual([url]);
    expect(product).toMatchObject({
      title: "Foldable Phone Stand",
      url,
      source: "page"
    });
  });

  it("rejects non-Jumia Nigeria URLs before fetching", async () => {
    await expect(
      fetchCurrentProductFromUrl("https://example.com/product.html", adapter, async () => "")
    ).rejects.toThrow("Open a Jumia Nigeria product page before searching.");
  });
});
