import { buildSearchQueries } from "@core/query-builder";
import type { ProductSnapshot } from "@core/types";
import type { MarketplaceAdapter } from "@marketplaces/adapter";
import { parseProductPage, parseSearchResults } from "@marketplaces/jumia-ng/parser";

export const jumiaNgAdapter: MarketplaceAdapter = {
  id: "jumia-ng",
  buildSearchRequests(product: ProductSnapshot) {
    return buildSearchQueries(product).map((query) => ({
      query,
      url: `https://www.jumia.com.ng/catalog/?q=${encodeURIComponent(query)}`
    }));
  },
  parseSearchResults,
  parseProductDetails: parseProductPage
};
