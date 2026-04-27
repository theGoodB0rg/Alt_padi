import { describe, expect, it } from "vitest";
import { scoreCandidates } from "@core/matcher/matcher";
import type { ProductSnapshot } from "@core/types";

const source: ProductSnapshot = {
  title: "180 °RotatablePhone HolderRetractable Disc Base Phone Stand",
  url: "https://www.jumia.com.ng/source.html",
  categoryPath: ["Phones & Tablets", "Mobile Phone Accessories", "Mounts & Stands", "Stands"],
  price: { amount: 3278, currency: "NGN", raw: "3278.00" },
  rating: 4.2,
  specs: {
    sku: "GE779EA50N40ONAFAMZ",
    model: "....",
    "shipping speed": "Excellent",
    "customer rating": "Average"
  },
  source: "page"
};

describe("accessory matching", () => {
  it("treats cheaper reviewed phone holders as actionable medium-confidence alternatives", () => {
    const [score] = scoreCandidates(source, [
      {
        title: "Multifunctional Folding Metal Rotating Cell Phone Holder",
        url: "https://www.jumia.com.ng/holder.html",
        categoryPath: [],
        price: { amount: 2499, currency: "NGN", raw: "₦ 2,499" },
        rating: 4.2,
        reviewCount: 303,
        specs: {},
        source: "search"
      }
    ]);

    expect(score.confidence).toBe("medium");
    expect(score.reasons).toEqual(expect.arrayContaining(["cheaper price", "similar title", "solid review signal"]));
    expect(score.warnings).not.toContain("missing comparable specs");
  });
});
