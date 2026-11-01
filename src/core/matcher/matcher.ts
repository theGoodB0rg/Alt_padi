import type { CandidateScore, ProductSnapshot, RunSummary } from "@core/types";
import { compareCategories, identifyProduct, relateProducts, stem } from "@core/matcher/product-identity";
import { readQuantities, unitPrice } from "@core/parsers/quantity";
import { similarity } from "@core/parsers/tokenizer";
import { SCORE_WEIGHTS } from "@core/matcher/weights";

const COMPARABLE_SPEC_KEY_PATTERN = /^(model|model number|size|screen size|display|capacity|weight|weight \(kg\)|color|colour|material|dimensions?|width|height|depth|volume|flavou?r|pack size)$/i;
const NOISY_SPEC_KEYS = new Set(["shipping speed", "quality score", "customer rating", "cancellation rate", "sku"]);
const PLACEHOLDER_VALUES = new Set(["....", "...", "n/a", "na", "none", "-"]);

/** A same-item listing below this fraction of the typical price is treated as suspect. */
const SUSPICIOUS_PRICE_RATIO = 0.4;

export function scoreCandidates(source: ProductSnapshot, candidates: ProductSnapshot[]): CandidateScore[] {
  const scored = candidates.map((candidate) => scoreCandidate(source, candidate));
  flagImplausiblePrices(source, scored);
  return scored.sort((a, b) => b.totalScore - a.totalScore);
}

export function summarizeCandidates(source: ProductSnapshot, scores: CandidateScore[]): RunSummary {
  const exact = scores
    .filter((score) => score.match === "same-item" && !score.suspicious && score.product.price)
    .sort((a, b) => a.product.price!.amount - b.product.price!.amount);
  const prices = exact.map((score) => score.product.price!.amount);
  const cheapest = exact[0];
  return {
    sameItemCount: exact.length,
    cheapestSameItem: cheapest,
    sourceIsCheapest: !cheapest || !source.price || cheapest.product.price!.amount >= source.price.amount,
    sameItemPriceRange: prices.length
      ? { min: prices[0], median: prices[Math.floor(prices.length / 2)], max: prices[prices.length - 1] }
      : undefined,
    suspiciousCount: scores.filter((score) => score.suspicious).length,
    samePriceCount: source.price ? prices.filter((price) => price === source.price!.amount).length : 0
  };
}

/**
 * Market-relative sanity check, valid for any category: the same item does not sell for a
 * fraction of what everyone else charges. Such listings are usually a part, an accessory
 * mis-filed under the item, a "deposit" price, or bait.
 */
function flagImplausiblePrices(source: ProductSnapshot, scores: CandidateScore[]): void {
  const references = [
    source.price?.amount,
    ...scores.filter((s) => s.match === "same-item").map((s) => s.product.price?.amount)
  ].filter((value): value is number => value !== undefined && value > 0);
  if (!references.length) return;
  const typical = median(references);
  const sourceUnit = source.price ? unitPrice(source.price.amount, readQuantities(sourceText(source))) : undefined;

  for (const score of scores) {
    if (score.match !== "same-item" && score.match !== "variant") continue;
    const price = score.product.price?.amount;
    if (!price) continue;
    let implausible: boolean;
    if (sourceUnit && score.unitPrice && sourceUnit.unit === score.unitPrice.unit) {
      implausible = score.unitPrice.amount < sourceUnit.amount * SUSPICIOUS_PRICE_RATIO;
    } else if (score.match === "variant") {
      continue; // different size with no readable quantity: price gap is expected
    } else {
      implausible = price < typical * SUSPICIOUS_PRICE_RATIO;
    }
    if (!implausible) continue;
    score.suspicious = true;
    score.confidence = "low";
    score.totalScore = Math.min(score.totalScore, 20);
    score.warnings.push("suspiciously cheap for this item - check it is the real thing");
  }
}

function scoreCandidate(source: ProductSnapshot, product: ProductSnapshot): CandidateScore {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let total = 0;

  const relation = relateProducts(source, product);
  const match = relation.match;
  if (relation.reason) reasons.push(relation.reason);
  if (relation.warning) warnings.push(relation.warning);
  if (match === "same-item") total += 30;
  else if (match === "variant") total += 12;

  const priceDelta = source.price && product.price ? source.price.amount - product.price.amount : undefined;
  const priceDeltaPercent =
    priceDelta !== undefined && source.price ? (priceDelta / source.price.amount) * 100 : undefined;

  // Price per kg / litre / piece makes different pack sizes comparable (groceries, toiletries...).
  const candidateUnit = product.price ? unitPrice(product.price.amount, readQuantities(sourceText(product))) : undefined;
  const sourceUnit = source.price ? unitPrice(source.price.amount, readQuantities(sourceText(source))) : undefined;
  const comparableUnits = candidateUnit && sourceUnit && candidateUnit.unit === sourceUnit.unit;

  if (match === "variant" && comparableUnits) {
    const unitDelta = ((sourceUnit.amount - candidateUnit.amount) / sourceUnit.amount) * 100;
    if (unitDelta > 0) {
      total += Math.min(SCORE_WEIGHTS.priceImprovement, Math.max(4, unitDelta));
      reasons.push(`cheaper per ${candidateUnit.unit}`);
    } else {
      warnings.push(`dearer per ${candidateUnit.unit}`);
    }
  } else if (match !== "accessory" && priceDelta !== undefined && priceDelta > 0) {
    total += Math.min(SCORE_WEIGHTS.priceImprovement, Math.max(4, priceDeltaPercent ?? 0));
    reasons.push("cheaper price");
  } else if (match !== "accessory" && priceDelta === 0) {
    reasons.push("same price");
  } else if (match !== "accessory" && priceDelta !== undefined) {
    warnings.push("not cheaper");
  }

  if (source.brand && product.brand) {
    if (source.brand.toLowerCase() === product.brand.toLowerCase()) {
      total += SCORE_WEIGHTS.brandMatch;
      reasons.push("same brand");
    } else {
      total -= 8;
      warnings.push("different brand");
    }
  }

  const titleScore = similarity(source.title, product.title);
  total += titleScore * SCORE_WEIGHTS.titleSimilarity;
  if (titleScore >= 0.25) reasons.push("similar title");
  // A different model is expected to have a different title; only flag it where identity matters.
  if (titleScore < 0.18 && match !== "alternative") warnings.push("weak title match");

  const categoryRelation = compareCategories(source.categoryPath, product.categoryPath);
  const categoryScore = categoryRelation === "same" ? 1 : categoryRelation === "sibling" ? 0.6 : 0;
  total += categoryScore * SCORE_WEIGHTS.categorySimilarity;
  if (categoryScore >= 0.5) reasons.push("same category");

  const comparableSpecs = comparableSpecEntries(source);
  const specScore = specOverlap(comparableSpecs, product);
  total += specScore * SCORE_WEIGHTS.specOverlap;
  if (specScore >= 0.5) reasons.push("similar specs");
  if (comparableSpecs.length >= 2 && Object.keys(product.specs).length === 0) {
    total -= SCORE_WEIGHTS.missingDataPenalty;
    if (match === "same-item" || match === "variant") warnings.push("missing comparable specs");
  }

  // Numbered specs both listings state (8GB/256GB, 50kg, 55 inch, 1000W): closest configuration first.
  const shared = sharedQuantitySpecs(source, product);
  total += shared.score * SCORE_WEIGHTS.quantityMatch;
  if (shared.matched.length && match === "alternative") reasons.push(`same ${shared.matched.slice(0, 3).join(", ")}`);

  const coverage = descriptorCoverage(source, product);
  total += coverage.score * SCORE_WEIGHTS.descriptorCoverage;
  if (coverage.score >= 0.65) reasons.push("matches described features");
  else if (coverage.missing.length) warnings.push(`doesn't mention: ${coverage.missing.slice(0, 4).join(", ")}`);

  const dimensionScore = dimensionsCompatibility(source, product);
  total += dimensionScore * SCORE_WEIGHTS.dimensionsCompatibility;
  if (dimensionScore >= 0.7) reasons.push("similar dimensions");
  if (source.dimensions && !product.dimensions) warnings.push("missing dimensions");

  if ((product.rating ?? 0) >= 4 && (product.reviewCount ?? 0) >= 10) {
    total += SCORE_WEIGHTS.ratingTrust;
    reasons.push("solid review signal");
  } else if (product.rating !== undefined || product.reviewCount !== undefined) {
    total -= 3;
    warnings.push("weak review signal");
  }

  if (product.sellerScore !== undefined) {
    if (product.sellerScore >= 70) {
      total += SCORE_WEIGHTS.sellerTrust;
      reasons.push(`trusted seller (${product.sellerScore}%)`);
    } else if (product.sellerScore < 50) {
      total -= SCORE_WEIGHTS.sellerTrust * 2;
      warnings.push(`low seller score (${product.sellerScore}%)`);
    }
  }

  if (product.seller?.toLowerCase().includes("official")) {
    total += SCORE_WEIGHTS.sellerTrust;
    reasons.push("official-store signal");
  }

  // Accessories and unrelated products can share every keyword with the item and still not be it.
  if (match === "accessory") total = Math.min(total, 15);
  if (match === "unrelated") total = Math.min(total, 10);

  const rounded = Math.max(0, Math.round(total));
  const lowOnly = match === "accessory" || match === "unrelated";
  return {
    product,
    match,
    totalScore: rounded,
    confidence: lowOnly ? "low" : rounded >= 58 ? "high" : rounded >= 22 ? "medium" : "low",
    reasons: [...new Set(reasons)],
    warnings: [...new Set(warnings)],
    priceDelta,
    priceDeltaPercent,
    // Only meaningful next to the viewed item's own per-unit price (a phone has no price per kg).
    unitPrice: comparableUnits ? candidateUnit : undefined
  };
}

function sourceText(product: ProductSnapshot): string {
  return `${product.title} ${Object.values(product.specs).join(" ")}`;
}

/**
 * How much of what the source says about itself ("height adjustable", "parboiled", "waterproof",
 * "long sleeve") the candidate also says. Works on whatever words the listing uses: no feature list.
 */
function descriptorCoverage(source: ProductSnapshot, candidate: ProductSnapshot): { score: number; missing: string[] } {
  const wanted = identifyProduct(source).descriptors.filter((word) => word.length > 2);
  if (wanted.length < 2) return { score: 0, missing: [] };
  const haystack = new Set(
    [candidate.title, candidate.brand, candidate.categoryPath.join(" "), ...Object.entries(candidate.specs).flat()]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map(stem)
  );
  const missing = wanted.filter((word) => !haystack.has(stem(word)));
  return { score: (wanted.length - missing.length) / wanted.length, missing };
}

function sharedQuantitySpecs(source: ProductSnapshot, candidate: ProductSnapshot): { score: number; matched: string[] } {
  const a = readQuantities(sourceText(source)).specs;
  const b = readQuantities(sourceText(candidate)).specs;
  const wanted = Object.entries(a).flatMap(([unit, values]) => values.map((value) => ({ unit, value })));
  if (!wanted.length) return { score: 0, matched: [] };
  const matched = wanted.filter(({ unit, value }) =>
    (b[unit] ?? []).some((other) => Math.abs(other - value) / Math.max(other, value) <= 0.01)
  );
  return { score: matched.length / wanted.length, matched: matched.map(({ unit, value }) => `${value}${unit}`) };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function comparableSpecEntries(source: ProductSnapshot): Array<[string, string]> {
  return Object.entries(source.specs).filter(([key, value]) => {
    const normalizedKey = key.toLowerCase();
    const normalizedValue = value.trim().toLowerCase();
    return (
      COMPARABLE_SPEC_KEY_PATTERN.test(normalizedKey) &&
      !NOISY_SPEC_KEYS.has(normalizedKey) &&
      !PLACEHOLDER_VALUES.has(normalizedValue)
    );
  });
}

function specOverlap(sourceEntries: Array<[string, string]>, candidate: ProductSnapshot): number {
  if (!sourceEntries.length) return 0;
  let matched = 0;
  for (const [key, value] of sourceEntries) {
    const candidateValue = candidate.specs[key];
    if (candidateValue && normalize(value) === normalize(candidateValue)) matched += 1;
  }
  return matched / sourceEntries.length;
}

function dimensionsCompatibility(source: ProductSnapshot, candidate: ProductSnapshot): number {
  if (!source.dimensions || !candidate.dimensions) return 0;
  const pairs = [
    [source.dimensions.widthCm, candidate.dimensions.widthCm],
    [source.dimensions.heightCm, candidate.dimensions.heightCm],
    [source.dimensions.depthCm, candidate.dimensions.depthCm]
  ].filter(([a, b]) => a !== undefined && b !== undefined) as Array<[number, number]>;
  if (!pairs.length) return 0;
  const compatible = pairs.filter(([a, b]) => Math.abs(a - b) / Math.max(a, b) <= 0.12).length;
  return compatible / pairs.length;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9.]+/g, "");
}
