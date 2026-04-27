import { scoreCandidates } from "@core/matcher/matcher";
import { similarity } from "@core/parsers/tokenizer";
import type { ProductSnapshot, SearchRun } from "@core/types";
import type { MarketplaceAdapter } from "@marketplaces/adapter";

export interface SearchRunnerOptions {
  maxQueries: number;
  maxSearchCandidates: number;
  maxDetailFetches: number;
  fetchText(url: string): Promise<string>;
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

  for (const request of requests) {
    try {
      const html = await options.fetchText(request.url);
      const results = adapter.parseSearchResults(html, request.url);
      for (const product of results) {
        if (candidatesByUrl.size >= options.maxSearchCandidates) break;
        candidatesByUrl.set(canonicalUrl(product.url), product);
      }
    } catch (error) {
      errors.push(`${request.query}: ${errorMessage(error)}`);
    }
  }

  const candidates = [...candidatesByUrl.values()];
  const detailTargets = candidates.filter((candidate) => shouldFetchDetails(sourceProduct, candidate)).slice(0, options.maxDetailFetches);
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

  return {
    sourceProduct,
    queries: requests.map((request) => request.query),
    candidates: scoreCandidates(sourceProduct, [...candidatesByUrl.values()]),
    errors,
    startedAt,
    completedAt: new Date().toISOString(),
    cacheHit: false
  };
}

function canonicalUrl(url: string): string {
  return url.split(/[?#]/)[0].replace(/\/$/, "");
}

function shouldFetchDetails(source: ProductSnapshot, candidate: ProductSnapshot): boolean {
  const needsDetails =
    Object.keys(candidate.specs).length === 0 ||
    candidate.price === undefined ||
    candidate.categoryPath.length === 0;
  return needsDetails && similarity(source.title, candidate.title) >= 0.25;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
