import { describe, expect, it } from "vitest";
import { scoreCandidates } from "@core/matcher/matcher";
import type { ProductSnapshot } from "@core/types";

const source: ProductSnapshot = {
  title: "Samsung 32-inch HD TV UA32T5300",
  url: "https://www.jumia.com.ng/source.html",
  brand: "Samsung",
  categoryPath: ["Electronics", "Televisions"],
  price: { amount: 150000, currency: "NGN", raw: "₦150,000" },
  rating: 4.5,
  reviewCount: 120,
  specs: { size: "32 inch", model: "UA32T5300", resolution: "HD" },
  dimensions: { widthCm: 73, heightCm: 43 },
  source: "page"
};

describe("scoreCandidates", () => {
  it("ranks a cheaper close match above a cheap unrelated product", () => {
    const scores = scoreCandidates(source, [
      {
        title: "Samsung 32-inch HD Smart TV UA32T5300",
        url: "https://www.jumia.com.ng/close.html",
        brand: "Samsung",
        categoryPath: ["Electronics", "Televisions"],
        price: { amount: 132000, currency: "NGN", raw: "₦132,000" },
        rating: 4.3,
        reviewCount: 62,
        specs: { size: "32 inch", model: "UA32T5300", resolution: "HD" },
        dimensions: { widthCm: 72, heightCm: 44 },
        source: "search"
      },
      {
        title: "Generic Plastic Storage Box Large",
        url: "https://www.jumia.com.ng/box.html",
        brand: "Generic",
        categoryPath: ["Home", "Storage"],
        price: { amount: 8000, currency: "NGN", raw: "₦8,000" },
        rating: 4.8,
        reviewCount: 300,
        specs: { material: "plastic" },
        source: "search"
      }
    ]);

    expect(scores[0].product.url).toContain("close");
    expect(scores[0].confidence).toBe("high");
    expect(scores[0].reasons).toContain("same brand");
    expect(scores[1].warnings).toContain("weak title match");
  });

  it("penalizes missing specs and worse review trust", () => {
    const [score] = scoreCandidates(source, [
      {
        title: "Samsung 32-inch HD TV UA32T5300",
        url: "https://www.jumia.com.ng/no-reviews.html",
        brand: "Samsung",
        categoryPath: ["Electronics", "Televisions"],
        price: { amount: 140000, currency: "NGN", raw: "₦140,000" },
        rating: 2.9,
        reviewCount: 1,
        specs: {},
        source: "search"
      }
    ]);

    expect(score.confidence).toBe("medium");
    expect(score.warnings).toEqual(
      expect.arrayContaining(["missing comparable specs", "weak review signal"])
    );
  });
});
