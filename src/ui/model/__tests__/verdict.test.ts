import { describe, expect, it } from "vitest";
import { buildVerdict } from "@ui/model/verdict";
import { makeCandidate, makeProduct, makeRun } from "@test/fixtures";

describe("buildVerdict", () => {
  it("leads with the saving when the same item is cheaper elsewhere", () => {
    const cheapest = makeCandidate({ product: { price: 132000, seller: "Official Store" } });
    const run = makeRun([makeCandidate({ product: { price: 140000 } }), cheapest]);

    expect(buildVerdict(run)).toEqual({ kind: "save", saving: 18000, cheapest, sellerCount: 2, sourcePrice: 150000 });
  });

  it("says the user already has the lowest price", () => {
    const run = makeRun([makeCandidate({ product: { price: 160000 } })]);
    expect(buildVerdict(run)).toMatchObject({ kind: "lowest", sellerCount: 1 });
  });

  it("says when no other seller has the exact item", () => {
    const run = makeRun([makeCandidate({ match: "alternative", product: { price: 100000 } })]);
    expect(buildVerdict(run)).toMatchObject({ kind: "unique" });
  });

  it("points to a better-rated seller at the same price", () => {
    const safer = makeCandidate({ product: { price: 150000, seller: "GadgetZone", sellerScore: 95 } });
    const run = makeRun([safer], makeProduct({ seller: "PhoneHub", sellerScore: 84 }));

    expect(buildVerdict(run)).toMatchObject({ kind: "lowest", saferSeller: safer });
  });

  it("does not suggest a seller who is rated lower than the user's", () => {
    const worse = makeCandidate({ product: { price: 150000, sellerScore: 70 } });
    const run = makeRun([worse], makeProduct({ sellerScore: 84 }));

    expect(buildVerdict(run)).toMatchObject({ kind: "lowest", saferSeller: undefined });
  });
});
