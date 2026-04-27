import type { ProductSnapshot } from "@core/types";
import type { MarketplaceAdapter } from "@marketplaces/adapter";

const JUMIA_NG_PRODUCT_URL = /^https:\/\/www\.jumia\.com\.ng\/.+\.html(?:[?#].*)?$/i;

export async function fetchCurrentProductFromUrl(
  url: string,
  adapter: MarketplaceAdapter,
  fetchText: (url: string) => Promise<string>
): Promise<ProductSnapshot> {
  if (!JUMIA_NG_PRODUCT_URL.test(url)) {
    throw new Error("Open a Jumia Nigeria product page before searching.");
  }

  const html = await fetchText(url);
  return {
    ...adapter.parseProductDetails(html, url),
    url,
    source: "page"
  };
}
