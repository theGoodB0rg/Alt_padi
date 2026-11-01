import { buildSearchIntents } from "@core/query-builder";
import type { ProductSnapshot, SearchIntent } from "@core/types";
import type { MarketplaceAdapter } from "@marketplaces/adapter";
import { parseProductPage, parseSearchResults } from "@marketplaces/jumia-ng/parser";

const ORIGIN = "https://www.jumia.com.ng";

export const jumiaNgAdapter: MarketplaceAdapter = {
  id: "jumia-ng",
  buildSearchRequests(product: ProductSnapshot) {
    const requests = buildSearchIntents(product).map((intent) => ({
      query: intent.query,
      url: searchUrl(product, intent)
    }));
    return requests.filter((request, index) => requests.findIndex((r) => r.url === request.url) === index);
  },
  parseSearchResults,
  parseProductDetails: parseProductPage
};

/** Jumia scopes a search to a category with /<category-slug>/?q=... */
function searchUrl(product: ProductSnapshot, intent: SearchIntent): string {
  // A department alone ("groceries") is too broad to scope by; search the whole store instead.
  const slugs = (product.categorySlugs ?? []).length >= 2 ? product.categorySlugs! : [];
  const slug = intent.scope === "category" ? slugs.at(-1) : intent.scope === "parent" ? slugs.at(-2) : undefined;
  const path = slug ? `/${slug}/` : "/catalog/";
  return `${ORIGIN}${path}?q=${encodeURIComponent(intent.query)}`;
}
