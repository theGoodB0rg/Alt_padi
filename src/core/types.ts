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
  categoryPath: string[];
  rating?: number;
  reviewCount?: number;
  seller?: string;
  specs: Record<string, string>;
  dimensions?: Dimensions;
  source: "page" | "search" | "detail";
}

export interface CandidateScore {
  product: ProductSnapshot;
  totalScore: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  warnings: string[];
  priceDelta?: number;
  priceDeltaPercent?: number;
}

export interface SearchRun {
  sourceProduct: ProductSnapshot;
  queries: string[];
  candidates: CandidateScore[];
  errors: string[];
  startedAt: string;
  completedAt: string;
  cacheHit: boolean;
}

export interface SearchRequest {
  query: string;
  url: string;
}
