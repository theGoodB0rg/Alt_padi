import type { ProductSnapshot, SearchRequest } from "@core/types";

export interface MarketplaceAdapter {
  id: string;
  buildSearchRequests(product: ProductSnapshot): SearchRequest[];
  parseSearchResults(html: string, requestUrl: string): ProductSnapshot[];
  parseProductDetails(html: string, url: string): ProductSnapshot;
}
