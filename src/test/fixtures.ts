import type { CandidateScore, ProductSnapshot, SearchRun } from "@core/types";
import { summarizeCandidates } from "@core/matcher/matcher";

let nextId = 0;
type ProductOverrides = Partial<Omit<ProductSnapshot, "price">> & { price?: number };

const money = (amount: number) => ({ amount, currency: "NGN" as const, raw: `₦${amount}` });

export function makeProduct(overrides: ProductOverrides = {}): ProductSnapshot {
  const { price = 150000, ...rest } = overrides;
  return {
    title: "Samsung 32-inch HD TV UA32T5300",
    url: "https://www.jumia.com.ng/source.html",
    brand: "Samsung",
    categoryPath: ["Electronics", "Televisions"],
    specs: { model: "UA32T5300" },
    source: "page",
    ...rest,
    price: money(price)
  };
}

export function makeCandidate(
  overrides: Partial<Omit<CandidateScore, "product">> & { product?: ProductOverrides } = {},
  sourcePrice = 150000
): CandidateScore {
  const { product: productOverrides, ...rest } = overrides;
  const product = makeProduct({ source: "search", url: `https://www.jumia.com.ng/listing-${++nextId}.html`, ...productOverrides });
  const priceDelta = sourcePrice - product.price!.amount;
  return {
    product,
    match: "same-item",
    totalScore: 70,
    confidence: "high",
    reasons: [],
    warnings: [],
    priceDelta,
    ...rest
  };
}

export function makeRun(candidates: CandidateScore[], source: ProductSnapshot = makeProduct()): SearchRun {
  return {
    sourceProduct: source,
    queries: ["Samsung UA32T5300"],
    candidates,
    summary: summarizeCandidates(source, candidates),
    errors: [],
    startedAt: "2026-11-04T08:00:00.000Z",
    completedAt: "2026-11-04T08:00:01.000Z",
    cacheHit: false
  };
}
