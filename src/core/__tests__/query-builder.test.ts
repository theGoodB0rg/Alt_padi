import { describe, expect, it } from "vitest";
import { buildSearchQueries } from "@core/query-builder";
import type { ProductSnapshot } from "@core/types";

describe("buildSearchQueries", () => {
  it("emits bounded deduplicated queries from a messy product title", () => {
    const product: ProductSnapshot = {
      title: "Samsung Official Store 32-inch HD TV UA32T5300 2GB RAM - Black",
      url: "https://www.jumia.com.ng/samsung-tv.html",
      brand: "Samsung",
      categoryPath: ["Electronics", "Televisions"],
      specs: { display: "32 inch", model: "UA32T5300" },
      source: "page"
    };

    expect(buildSearchQueries(product)).toEqual([
      "Samsung UA32T5300",
      "Samsung 32 inch television",
      "UA32T5300 32inch hd tv",
      "Samsung 32inch hd tv"
    ]);
  });
});
