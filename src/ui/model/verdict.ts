import type { CandidateScore, SearchRun } from "@core/types";

export type Verdict =
  | { kind: "save"; saving: number; cheapest: CandidateScore; sellerCount: number; sourcePrice: number }
  | { kind: "lowest"; sellerCount: number; saferSeller?: CandidateScore }
  | { kind: "unique" };

/** The one-line answer to "can I pay less for this exact item?" */
export function buildVerdict(run: SearchRun): Verdict | undefined {
  const summary = run.summary;
  if (!summary) return undefined;
  const sourcePrice = run.sourceProduct.price?.amount;
  const cheapest = summary.cheapestSameItem;
  if (cheapest?.product.price && sourcePrice && !summary.sourceIsCheapest) {
    return {
      kind: "save",
      saving: sourcePrice - cheapest.product.price.amount,
      cheapest,
      sellerCount: summary.sameItemCount,
      sourcePrice
    };
  }
  if (!summary.sameItemCount) return { kind: "unique" };
  return { kind: "lowest", sellerCount: summary.sameItemCount, saferSeller: findSaferSeller(run) };
}

/** When prices tie, the seller is what differs: a better-rated seller at the same price. */
function findSaferSeller(run: SearchRun): CandidateScore | undefined {
  const { price, sellerScore } = run.sourceProduct;
  if (!price || sellerScore === undefined) return undefined;
  return run.candidates
    .filter(
      (c) =>
        c.match === "same-item" &&
        !c.suspicious &&
        c.product.price?.amount === price.amount &&
        (c.product.sellerScore ?? -1) > sellerScore
    )
    .sort((a, b) => b.product.sellerScore! - a.product.sellerScore!)[0];
}
