import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, filterCandidates, groupCandidates, matchLabel, visibleReasons } from "@ui/model/results";
import { makeCandidate, makeRun } from "@test/fixtures";

describe("filterCandidates", () => {
  const cheaper = makeCandidate({ product: { price: 140000 } });
  const samePrice = makeCandidate({ product: { price: 150000 } });
  const dearer = makeCandidate({ product: { price: 160000 } });
  const samePriceAlternative = makeCandidate({ match: "alternative", product: { price: 150000 } });
  const otherBrand = makeCandidate({ match: "alternative", product: { price: 120000, brand: "LG" } });
  const weak = makeCandidate({ match: "alternative", confidence: "low", product: { price: 100000 } });
  const accessory = makeCandidate({ match: "accessory", confidence: "low", product: { price: 5000 } });
  const unrelated = makeCandidate({ match: "unrelated", product: { price: 100 } });
  const run = makeRun([cheaper, samePrice, dearer, samePriceAlternative, otherBrand, weak, accessory, unrelated]);

  it("by default keeps cheaper items, same-price sellers of the exact item, and accessories", () => {
    expect(filterCandidates(run, DEFAULT_FILTERS)).toEqual([cheaper, samePrice, otherBrand, weak, accessory]);
  });

  it("shows dearer listings when 'cheaper only' is off", () => {
    expect(filterCandidates(run, { ...DEFAULT_FILTERS, cheaperOnly: false })).toContain(dearer);
  });

  it("keeps only the viewed brand when asked", () => {
    expect(filterCandidates(run, { ...DEFAULT_FILTERS, sameBrandOnly: true })).not.toContain(otherBrand);
  });

  it("drops weak matches below the chosen match level but never hides accessories", () => {
    const result = filterCandidates(run, { ...DEFAULT_FILTERS, minMatch: "good" });
    expect(result).not.toContain(weak);
    expect(result).toContain(accessory);
  });
});

describe("groupCandidates", () => {
  it("splits results into sections and sorts exact matches cheapest first", () => {
    const dear = makeCandidate({ product: { price: 145000 } });
    const cheap = makeCandidate({ product: { price: 120000 } });
    const variant = makeCandidate({ match: "variant" });
    const bait = makeCandidate({ suspicious: true, product: { price: 9000 } });

    const groups = groupCandidates([dear, variant, bait, cheap]);

    expect(groups.sameItem).toEqual([cheap, dear]);
    expect(groups.variant).toEqual([variant]);
    expect(groups.suspicious).toEqual([bait]);
    expect(groups.alternative).toEqual([]);
    expect(groups.accessory).toEqual([]);
  });
});

describe("matchLabel", () => {
  it("speaks plain English instead of confidence jargon", () => {
    expect(matchLabel("high")).toEqual({ label: "Best match", level: 3 });
    expect(matchLabel("medium")).toEqual({ label: "Good match", level: 2 });
    expect(matchLabel("low")).toEqual({ label: "Check details", level: 1 });
  });
});

describe("visibleReasons", () => {
  it("drops price reasons, which the price badge already shows", () => {
    const candidate = makeCandidate({ reasons: ["cheaper price", "same brand"], warnings: ["not cheaper", "different brand"] });
    expect(visibleReasons(candidate)).toEqual({ good: ["same brand"], bad: ["different brand"] });
  });
});
