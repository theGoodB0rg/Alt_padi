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
    "product details":
      "180° rotatable multi-function retractable weighing disc base mobile phone stand. Adjustable length: the length is adjustable, up and down can be rotated.",
    "height & angle adjustable":
      "360-degree swivel ball head. The height can be easily adjusted between 28 cm - 38 cm.",
    "weighted base": "The base is made of weighted material for stability.",
    sku: "GE779EA50N40ONAFAMZ",
    model: "...."
  },
  source: "page"
};

describe("accessory matching", () => {
  it("ranks a height-adjustable retractable holder above a cheaper flat folding holder", () => {
    const scores = scoreCandidates(source, [
      {
        title: "Multifunctional Folding Metal Rotating Cell Phone Holder",
        url: "https://www.jumia.com.ng/holder.html",
        categoryPath: [],
        price: { amount: 2499, currency: "NGN", raw: "₦ 2,499" },
        rating: 4.2,
        reviewCount: 303,
        specs: {},
        source: "search"
      },
      {
        title: "180° Rotatable Telescopic Height Adjustable Phone Holder With Weighted Base",
        url: "https://www.jumia.com.ng/telescopic.html",
        categoryPath: ["Phones & Tablets", "Mobile Phone Accessories", "Mounts & Stands", "Stands"],
        price: { amount: 2799, currency: "NGN", raw: "₦ 2,799" },
        rating: 4.1,
        reviewCount: 28,
        specs: {
          "key features": "height adjustable telescopic retractable phone holder with weighted base"
        },
        source: "detail"
      }
    ]);

    expect(scores[0].product.url).toContain("telescopic");
    expect(scores[0].reasons).toContain("matches functional features");
    expect(scores[1].warnings).toEqual(
      expect.arrayContaining([
        "missing height-adjustable signal",
        "missing retractable/telescopic signal",
        "missing weighted-base signal"
      ])
    );
  });
});
