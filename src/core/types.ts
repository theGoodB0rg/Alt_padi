export interface Money {
  amount: number;
  currency: "NGN";
  raw: string;
}

export interface Dimensions {
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  weightKg?: number;
}

export interface ProductSnapshot {
  title: string;
  url: string;
  imageUrl?: string;
  price?: Money;
  oldPrice?: Money;
  brand?: string;
  /** Marketplace category trail, broadest first, e.g. ["Grocery", "Food Cupboard", "Rice"]. */
  categoryPath: string[];
  /** URL slugs for each categoryPath level when known, e.g. ["grocery", "food-cupboard", "rice"]. */
  categorySlugs?: string[];
  rating?: number;
  reviewCount?: number;
  seller?: string;
  specs: Record<string, string>;
  dimensions?: Dimensions;
  source: "page" | "search" | "detail";
}

export type MatchKind = "same-item" | "variant" | "alternative" | "accessory" | "unrelated";

export interface CandidateScore {
  product: ProductSnapshot;
  /** How this listing relates to what the user is viewing. Only same-item/variant answer "is there a cheaper one of THIS?" */
  match: MatchKind;
  /** Same model but priced implausibly low versus the item being viewed. */
  suspicious?: boolean;
  totalScore: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  warnings: string[];
  priceDelta?: number;
  priceDeltaPercent?: number;
  /** Price per normalised unit (per kg, per litre, per piece) when a quantity could be read. */
  unitPrice?: { amount: number; unit: string };
}

export interface SearchRun {
  sourceProduct: ProductSnapshot;
  queries: string[];
  candidates: CandidateScore[];
  summary?: RunSummary;
  errors: string[];
  startedAt: string;
  completedAt: string;
  cacheHit: boolean;
}

export interface SearchRequest {
  query: string;
  url: string;
}

/** Marketplace-agnostic search plan: what to search for and how narrowly. */
export interface SearchIntent {
  query: string;
  /** "category": inside the item's own category; "parent": one level up; "all": whole store. */
  scope: "category" | "parent" | "all";
}

export interface RunSummary {
  /** Listings judged to be the exact same item (same model, compatible variant), cheapest first. */
  sameItemCount: number;
  cheapestSameItem?: CandidateScore;
  /** True when no exact listing undercuts the price the user is viewing. */
  sourceIsCheapest: boolean;
  sameItemPriceRange?: { min: number; median: number; max: number };
  /** Same-model listings priced so low they are probably accessories, parts or bait. */
  suspiciousCount: number;
}
