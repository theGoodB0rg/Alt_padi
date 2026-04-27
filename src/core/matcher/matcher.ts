import type { CandidateScore, ProductSnapshot } from "@core/types";
import { similarity } from "@core/parsers/tokenizer";
import { SCORE_WEIGHTS } from "@core/matcher/weights";

const COMPARABLE_SPEC_KEY_PATTERN = /^(model|model number|size|screen size|display|capacity|weight|weight \(kg\)|color|colour|material|dimensions?|width|height|depth)$/i;
const NOISY_SPEC_KEYS = new Set(["shipping speed", "quality score", "customer rating", "cancellation rate", "sku"]);
const PLACEHOLDER_VALUES = new Set(["....", "...", "n/a", "na", "none", "-"]);

export function scoreCandidates(
  source: ProductSnapshot,
  candidates: ProductSnapshot[]
): CandidateScore[] {
  return candidates
    .map((candidate) => scoreCandidate(source, candidate))
    .sort((a, b) => b.totalScore - a.totalScore);
}

function scoreCandidate(source: ProductSnapshot, product: ProductSnapshot): CandidateScore {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let total = 0;

  const priceDelta =
    source.price && product.price ? source.price.amount - product.price.amount : undefined;
  const priceDeltaPercent =
    priceDelta !== undefined && source.price ? (priceDelta / source.price.amount) * 100 : undefined;
  if (priceDelta !== undefined && priceDelta > 0) {
    total += Math.min(SCORE_WEIGHTS.priceImprovement, Math.max(4, priceDeltaPercent ?? 0));
    reasons.push("cheaper price");
  } else if (priceDelta !== undefined) {
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
  if (titleScore < 0.18) warnings.push("weak title match");

  const categoryScore = categorySimilarity(source.categoryPath, product.categoryPath);
  total += categoryScore * SCORE_WEIGHTS.categorySimilarity;
  if (categoryScore >= 0.5) reasons.push("similar category");
  if (categoryScore === 0 && source.categoryPath.length && product.categoryPath.length) {
    warnings.push("different category");
  }

  const comparableSpecs = comparableSpecEntries(source);
  const specScore = specOverlap(comparableSpecs, product);
  total += specScore * SCORE_WEIGHTS.specOverlap;
  if (specScore >= 0.5) reasons.push("similar specs");
  if (comparableSpecs.length >= 2 && Object.keys(product.specs).length === 0) {
    total -= SCORE_WEIGHTS.missingDataPenalty;
    warnings.push("missing comparable specs");
  }

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

  if (product.seller?.toLowerCase().includes("official")) {
    total += SCORE_WEIGHTS.sellerTrust;
    reasons.push("official-store signal");
  }

  const rounded = Math.max(0, Math.round(total));
  return {
    product,
    totalScore: rounded,
    confidence: rounded >= 58 ? "high" : rounded >= 22 ? "medium" : "low",
    reasons: [...new Set(reasons)],
    warnings: [...new Set(warnings)],
    priceDelta,
    priceDeltaPercent
  };
}

function categorySimilarity(source: string[], candidate: string[]): number {
  const a = source.map((part) => part.toLowerCase());
  const b = candidate.map((part) => part.toLowerCase());
  if (!a.length || !b.length) return 0;
  const matches = a.filter((part) => b.includes(part)).length;
  return matches / Math.max(a.length, b.length);
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
