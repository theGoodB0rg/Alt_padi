import { scoreCandidates, summarizeCandidates } from "@core/matcher/matcher";
import { relateProducts } from "@core/matcher/product-identity";
import { similarity } from "@core/parsers/tokenizer";
import type { ProductSnapshot, SearchProgress, SearchRun } from "@core/types";
import type { MarketplaceAdapter } from "@marketplaces/adapter";

export interface SearchRunnerOptions {
  maxQueries: number;
  maxSearchCandidates: number;
  maxDetailFetches: number;
  fetchText(url: string): Promise<string>;
  onProgress?(progress: SearchProgress): void;
}

export async function runAlternativeSearch(
  sourceProduct: ProductSnapshot,
  adapter: MarketplaceAdapter,
  options: SearchRunnerOptions
): Promise<SearchRun> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const requests = adapter.buildSearchRequests(sourceProduct).slice(0, options.maxQueries);
  const candidatesByUrl = new Map<string, ProductSnapshot>();
  // Accessories ("AGM Note N1 pouch") flood model searches. Keep a few for suggestions, but
  // never let them crowd real listings of the item out of the candidate budget.
  const accessoryUrls = new Set<string>();
  const maxAccessories = Math.min(8, Math.ceil(options.maxSearchCandidates / 4));

  const report = options.onProgress ?? (() => {});
  report({ stage: "searching", done: 0, total: requests.length });
  for (const [index, request] of requests.entries()) {
    try {
      const html = await options.fetchText(request.url);
      const results = adapter.parseSearchResults(html, request.url);
      for (const product of results) {
        const key = canonicalUrl(product.url);
        if (candidatesByUrl.has(key) || isSourceListing(sourceProduct, product)) continue;
        const isAccessory = relateProducts(sourceProduct, product).match === "accessory";
        if (isAccessory) {
          if (accessoryUrls.size >= maxAccessories) continue;
          accessoryUrls.add(key);
        } else if (candidatesByUrl.size - accessoryUrls.size >= options.maxSearchCandidates) {
          continue;
        }
        candidatesByUrl.set(key, product);
      }
    } catch (error) {
      errors.push(`${request.query}: ${errorMessage(error)}`);
    }
    report({ stage: "searching", done: index + 1, total: requests.length });
  }

  const candidates = [...candidatesByUrl.values()];
  report({ stage: "comparing", found: candidates.length });
  const detailTargets = candidates
    .filter((candidate) => shouldFetchDetails(sourceProduct, candidate))
    .sort((a, b) => detailPriority(sourceProduct, b) - detailPriority(sourceProduct, a))
    .slice(0, options.maxDetailFetches);
  for (const candidate of detailTargets) {
    try {
      const html = await options.fetchText(candidate.url);
      candidatesByUrl.set(canonicalUrl(candidate.url), {
        ...candidate,
        ...adapter.parseProductDetails(html, candidate.url)
      });
    } catch (error) {
      errors.push(`${candidate.title}: ${errorMessage(error)}`);
    }
  }

  const scored = scoreCandidates(sourceProduct, [...candidatesByUrl.values()]);
  return {
    sourceProduct,
    queries: requests.map((request) => request.query),
    candidates: scored,
    summary: summarizeCandidates(sourceProduct, scored),
    errors,
    startedAt,
    completedAt: new Date().toISOString(),
    cacheHit: false
  };
}

/**
 * The page being viewed can come back from its own search. Only the URL identifies it: another
 * seller's listing can carry the identical title and price, and that is exactly what the user
 * wants to know about.
 */
function isSourceListing(source: ProductSnapshot, candidate: ProductSnapshot): boolean {
  return canonicalUrl(candidate.url) === canonicalUrl(source.url);
}

function canonicalUrl(url: string): string {
  return url.split(/[?#]/)[0].replace(/\/$/, "");
}

function shouldFetchDetails(source: ProductSnapshot, candidate: ProductSnapshot): boolean {
  const needsDetails =
    Object.keys(candidate.specs).length === 0 ||
    candidate.price === undefined ||
    candidate.categoryPath.length === 0;
  if (!needsDetails) return false;
  const match = relateProducts(source, candidate).match;
  if (match === "accessory" || match === "unrelated") return false;
  return match === "same-item" || match === "variant" || similarity(source.title, candidate.title) >= 0.25;
}

/** Verify likely exact matches first: they decide whether the user is already on the cheapest listing. */
function detailPriority(source: ProductSnapshot, candidate: ProductSnapshot): number {
  const match = relateProducts(source, candidate).match;
  return (match === "same-item" ? 2 : match === "variant" ? 1 : 0) + similarity(source.title, candidate.title);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
