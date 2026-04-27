import { describe, expect, it } from "vitest";
import { tokenizeTitle } from "@core/parsers/tokenizer";
import { buildSearchQueries } from "@core/query-builder";
import type { ProductSnapshot } from "@core/types";

describe("Jumia messy accessory titles", () => {
  it("splits glued product words from Jumia titles", () => {
    expect(tokenizeTitle("180 °RotatablePhone HolderRetractable Disc Base Phone Stand")).toEqual([
      "180",
      "rotatable",
      "phone",
      "holder",
      "retractable",
      "disc",
      "base",
      "phone",
      "stand"
    ]);
  });

  it("builds useful accessory search queries when brand and model are missing", () => {
    const product: ProductSnapshot = {
      title: "180 °RotatablePhone HolderRetractable Disc Base Phone Stand",
      url: "https://www.jumia.com.ng/product.html",
      categoryPath: ["Phones & Tablets", "Mobile Phone Accessories", "Mounts & Stands", "Stands"],
      price: { amount: 3278, currency: "NGN", raw: "3278.00" },
      specs: { model: "....", sku: "GE779EA50N40ONAFAMZ" },
      source: "page"
    };

    expect(buildSearchQueries(product)).toEqual([
      "rotatable phone holder stand",
      "phone holder retractable stand",
      "mobile phone holder stand",
      "phone stand"
    ]);
  });
});
