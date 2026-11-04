import type { CandidateScore, SearchRun } from "@core/types";

export type MatchLevel = "any" | "good" | "best";

export interface Filters {
  cheaperOnly: boolean;
  sameBrandOnly: boolean;
  minMatch: MatchLevel;
}

export const DEFAULT_FILTERS: Filters = { cheaperOnly: true, sameBrandOnly: false, minMatch: "any" };

const CONFIDENCE_LEVEL: Record<CandidateScore["confidence"], number> = { low: 0, medium: 1, high: 2 };
const MIN_LEVEL: Record<MatchLevel, number> = { any: 0, good: 1, best: 2 };

/** Accessories and suspicious listings are side notes: price and match filters don't apply to them. */
const isSideNote = (c: CandidateScore) => c.match === "accessory" || Boolean(c.suspicious);

export function filterCandidates(run: SearchRun, filters: Filters): CandidateScore[] {
  const sourceBrand = run.sourceProduct.brand?.toLowerCase();
  return run.candidates.filter((candidate) => {
    if (candidate.match === "unrelated") return false;
    if (filters.cheaperOnly && !isSideNote(candidate) && !isWorthShowing(candidate)) return false;
    if (filters.sameBrandOnly && sourceBrand && candidate.product.brand?.toLowerCase() !== sourceBrand) return false;
    if (isSideNote(candidate)) return true;
    return CONFIDENCE_LEVEL[candidate.confidence] >= MIN_LEVEL[filters.minMatch];
  });
}

/** Cheaper, or the exact item at the same price (another seller is still worth seeing). */
function isWorthShowing(candidate: CandidateScore): boolean {
  const delta = candidate.priceDelta ?? 0;
  return candidate.match === "same-item" ? delta >= 0 : delta > 0;
}

export interface CandidateGroups {
  sameItem: CandidateScore[];
  variant: CandidateScore[];
  alternative: CandidateScore[];
  accessory: CandidateScore[];
  suspicious: CandidateScore[];
}

export function groupCandidates(candidates: CandidateScore[]): CandidateGroups {
  const of = (match: CandidateScore["match"]) => candidates.filter((c) => c.match === match && !c.suspicious);
  return {
    sameItem: of("same-item").sort(byPrice),
    variant: of("variant"),
    alternative: of("alternative"),
    accessory: of("accessory"),
    suspicious: candidates.filter((c) => c.suspicious)
  };
}

export function byPrice(a: CandidateScore, b: CandidateScore): number {
  return (a.product.price?.amount ?? Infinity) - (b.product.price?.amount ?? Infinity);
}

const MATCH_LABELS: Record<CandidateScore["confidence"], { label: string; level: 1 | 2 | 3 }> = {
  high: { label: "Best match", level: 3 },
  medium: { label: "Good match", level: 2 },
  low: { label: "Check details", level: 1 }
};

export function matchLabel(confidence: CandidateScore["confidence"]) {
  return MATCH_LABELS[confidence];
}

/** The price badge already says cheaper/same/dearer, so those reasons would repeat it. */
const PRICE_REASONS = new Set(["cheaper price", "same price", "not cheaper"]);

export function visibleReasons(candidate: CandidateScore): { good: string[]; bad: string[] } {
  return {
    good: candidate.reasons.filter((r) => !PRICE_REASONS.has(r)),
    bad: candidate.warnings.filter((w) => !PRICE_REASONS.has(w))
  };
}
