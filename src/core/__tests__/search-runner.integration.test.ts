import { describe, expect, it } from "vitest";
import { runAlternativeSearch } from "@core/search-runner";
import type { MarketplaceAdapter } from "@marketplaces/adapter";
import type { ProductSnapshot } from "@core/types";

describe("runAlternativeSearch", () => {
  const source: ProductSnapshot = {
    title: "Samsung 32-inch HD TV UA32T5300",
    url: "https://www.jumia.com.ng/source.html",
    brand: "Samsung",
    categoryPath: ["Electronics", "Televisions"],
    price: { amount: 150000, currency: "NGN", raw: "₦150,000" },
    specs: { model: "UA32T5300", size: "32 inch" },
    source: "page"
  };

  it("enforces request budgets, deduplicates candidates, and returns ranked partial results", async () => {
    const fetches: string[] = [];
    const adapter: MarketplaceAdapter = {
      id: "jumia-ng",
      buildSearchRequests: () => [
        { query: "Samsung UA32T5300", url: "https://www.jumia.com.ng/catalog/?q=Samsung+UA32T5300" },
        { query: "Samsung TV", url: "https://www.jumia.com.ng/catalog/?q=Samsung+TV" }
      ],
      parseSearchResults: (html) =>
        html.includes("first")
          ? [
              {
                title: "Samsung 32-inch HD TV UA32T5300",
                url: "https://www.jumia.com.ng/a.html",
                brand: "Samsung",
                categoryPath: ["Electronics", "Televisions"],
                price: { amount: 140000, currency: "NGN", raw: "₦140,000" },
                specs: { model: "UA32T5300", size: "32 inch" },
                source: "search"
              },
              {
                title: "Samsung 32-inch HD TV UA32T5300 duplicate",
                url: "https://www.jumia.com.ng/a.html",
                brand: "Samsung",
                categoryPath: ["Electronics", "Televisions"],
                price: { amount: 140000, currency: "NGN", raw: "₦140,000" },
                specs: { model: "UA32T5300", size: "32 inch" },
                source: "search"
              }
            ]
          : [
              {
                title: "Samsung TV Wall Bracket",
                url: "https://www.jumia.com.ng/b.html",
                brand: "Samsung",
                categoryPath: [],
                price: { amount: 8000, currency: "NGN", raw: "₦8,000" },
                specs: {},
                source: "search"
              }
            ],
      parseProductDetails: (html, url) => ({
        title: html.includes("detail") ? "Samsung 32-inch HD TV UA32T5300" : "Generic Storage Box",
        url,
        brand: html.includes("detail") ? "Samsung" : "Generic",
        categoryPath: html.includes("detail") ? ["Electronics", "Televisions"] : ["Home"],
        price: html.includes("detail")
          ? { amount: 140000, currency: "NGN", raw: "₦140,000" }
          : { amount: 8000, currency: "NGN", raw: "₦8,000" },
        rating: html.includes("detail") ? 4.4 : 4.8,
        reviewCount: html.includes("detail") ? 80 : 400,
        specs: html.includes("detail")
          ? { model: "UA32T5300", size: "32 inch" }
          : ({} as Record<string, string>),
        source: "detail"
      })
    };

    const run = await runAlternativeSearch(source, adapter, {
      maxQueries: 2,
      maxSearchCandidates: 2,
      maxDetailFetches: 1,
      fetchText: async (url) => {
        fetches.push(url);
        if (url.includes("Samsung+UA32T5300")) return "first";
        if (url.includes("Samsung+TV")) return "second";
        throw new Error("network unavailable");
      }
    });

    expect(fetches).toHaveLength(3);
    expect(run.queries).toEqual(["Samsung UA32T5300", "Samsung TV"]);
    expect(run.candidates).toHaveLength(2);
    expect(run.candidates[0].product.url).toBe("https://www.jumia.com.ng/a.html");
    expect(run.errors).toEqual(
      expect.arrayContaining(["Samsung TV Wall Bracket: network unavailable"])
    );
  });
});
