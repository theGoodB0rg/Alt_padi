import { describe, expect, it } from "vitest";
import { scoreCandidates, summarizeCandidates } from "@core/matcher/matcher";
import { compareCategories, modelPhrase, relateProducts } from "@core/matcher/product-identity";
import { buildSearchIntents } from "@core/query-builder";
import type { ProductSnapshot } from "@core/types";

/** Category trails exactly as Jumia publishes them on search cards (data-gtm-category). */
const CAT = {
  phone: ["Phones & Tablets", "Mobile Phones", "Smartphones", "Android Phones"],
  phoneCase: ["Phones & Tablets", "Accessories", "Cases", "Cases"],
  flipCase: ["Phones & Tablets", "Accessories", "Cases", "Flip Cases"],
  screenGuard: ["Phones & Tablets", "Accessories", "Screen Protectors"],
  parts: ["Phones & Tablets", "Accessories", "Replacement Parts"],
  rice: ["Grocery", "Food Cupboard", "Grains & Rice", "Rice"],
  beans: ["Grocery", "Food Cupboard", "Grains & Rice", "Beans"],
  riceCooker: ["Home & Office", "Small Appliances", "Rice Cookers"],
  sneakers: ["Fashion", "Men's Fashion", "Shoes", "Sneakers"],
  shoeCare: ["Fashion", "Men's Fashion", "Accessories", "Shoe Care"],
  diapers: ["Baby Products", "Diapering", "Disposable Diapers"]
};

function listing(title: string, amount: number, categoryPath: string[], brand?: string): ProductSnapshot {
  return {
    title,
    url: `https://www.jumia.com.ng/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`,
    brand,
    categoryPath,
    price: { amount, currency: "NGN", raw: String(amount) },
    specs: {},
    source: "search"
  };
}

describe("category relation (no product vocabulary)", () => {
  it("uses the marketplace tree to tell product types apart", () => {
    expect(compareCategories(CAT.phone, ["Phones & Tablets", "Mobile Phones", "Smartphones"])).toBe("same");
    expect(compareCategories(CAT.phoneCase, CAT.flipCase)).toBe("sibling");
    expect(compareCategories(CAT.rice, CAT.beans)).toBe("sibling");
    expect(compareCategories(CAT.phone, CAT.phoneCase)).toBe("different");
    expect(compareCategories(CAT.rice, CAT.riceCooker)).toBe("different");
    expect(compareCategories(CAT.sneakers, CAT.shoeCare)).toBe("different");
    expect(compareCategories([], CAT.rice)).toBe("unknown");
  });
});

describe("phones: the original AGM Note N1 complaint", () => {
  const phone = { ...listing('AGM Note N1 6.52" 8GB RAM 256GB ROM Rugged Smartphone', 189000, CAT.phone, "AGM"), source: "page" as const };

  it("never reports a pouch, screen guard or spare part as the cheapest AGM Note N1", () => {
    const scores = scoreCandidates(phone, [
      listing("AGM NOTE N1 TPU CASE POUCH", 4607, CAT.phoneCase, "Generic"),
      listing('AGM NOTE N1 (6.5") Screen Protector-Full Glass', 2651, CAT.screenGuard, "Generic"),
      listing("AGM Note N1 LCD Screen", 24500, CAT.parts, "Generic"),
      listing("AGM Note N1 8GB RAM 256GB ROM Rugged Phone - Black", 175000, CAT.phone, "AGM"),
      listing("AGM Note N1 8GB/256GB Rugged Smartphone", 182000, CAT.phone, "AGM"),
      listing("AGM Note N1 6GB RAM 128GB ROM Rugged Phone", 150000, CAT.phone, "AGM"),
      listing("AGM Note N1 Pro 8GB 256GB", 170000, CAT.phone, "AGM"),
      listing("AGM Note N1 8GB 256GB Smartphone", 45000, CAT.phone, "AGM")
    ]);
    const byTitle = (t: string) => scores.find((s) => s.product.title.startsWith(t))!;

    expect(byTitle("AGM NOTE N1 TPU").match).toBe("accessory");
    expect(byTitle('AGM NOTE N1 (6.5")').match).toBe("accessory");
    expect(byTitle("AGM Note N1 LCD").match).toBe("accessory");
    expect(byTitle("AGM Note N1 6GB").match).toBe("variant");
    expect(byTitle("AGM Note N1 Pro").match).toBe("alternative");
    expect(byTitle("AGM Note N1 8GB 256GB Smartphone").suspicious).toBe(true);

    const summary = summarizeCandidates(phone, scores);
    expect(summary.cheapestSameItem?.product.price?.amount).toBe(175000);
    expect(summary.sameItemCount).toBe(2);
    expect(summary.sourceIsCheapest).toBe(false);
  });

  it("reports honestly when only accessories exist for the item", () => {
    const scores = scoreCandidates(phone, [
      listing("AGM NOTE N1 TPU CASE POUCH", 4607, CAT.phoneCase, "Generic"),
      listing("AGM Note N1 LCD Screen", 24500, CAT.parts, "Generic")
    ]);
    const summary = summarizeCandidates(phone, scores);
    expect(summary.sameItemCount).toBe(0);
    expect(summary.sourceIsCheapest).toBe(true);
  });

  it("searches for the full model name inside the item's own category", () => {
    expect(modelPhrase(phone)).toBe("note n1");
    const intents = buildSearchIntents(phone);
    expect(intents[0]).toEqual({ query: "AGM note n1", scope: "category" });
    expect(intents).toContainEqual({ query: "AGM note n1 8gb 256gb", scope: "category" });
    expect(intents.some((intent) => intent.scope === "all")).toBe(true);
  });
});

describe("groceries: same logic, no food vocabulary", () => {
  const rice = { ...listing("Mama Gold Premium Parboiled Rice 50kg", 78000, CAT.rice, "Mama Gold"), source: "page" as const };

  it("finds the same bag cheaper and compares other sizes per kg", () => {
    const scores = scoreCandidates(rice, [
      listing("Mama Gold Premium Parboiled Rice - 50kg", 74500, CAT.rice, "Mama Gold"),
      listing("Mama Gold Premium Parboiled Rice 10kg", 14000, CAT.rice, "Mama Gold"),
      listing("Mama Gold Premium Parboiled Rice 5kg", 9500, CAT.rice, "Mama Gold"),
      listing("Royal Stallion Parboiled Rice 50kg", 72000, CAT.rice, "Royal Stallion"),
      listing("Mama Gold Rice Cooker 1.8L", 25000, CAT.riceCooker, "Mama Gold")
    ]);
    const byTitle = (t: string) => scores.find((s) => s.product.title.startsWith(t))!;

    expect(byTitle("Mama Gold Premium Parboiled Rice - 50kg").match).toBe("same-item");
    const tenKg = byTitle("Mama Gold Premium Parboiled Rice 10kg");
    expect(tenKg.match).toBe("variant");
    expect(tenKg.unitPrice).toEqual({ amount: 1400, unit: "kg" });
    expect(tenKg.reasons).toContain("cheaper per kg"); // ₦1,400/kg vs ₦1,560/kg
    expect(byTitle("Mama Gold Premium Parboiled Rice 5kg").warnings).toContain("dearer per kg");
    expect(byTitle("Royal Stallion").match).toBe("alternative");
    expect(byTitle("Mama Gold Rice Cooker").match).toBe("accessory"); // named after the brand, other category

    expect(summarizeCandidates(rice, scores).cheapestSameItem?.product.price?.amount).toBe(74500);
  });

  it("reads multipacks for drinks and diapers", () => {
    const coke = listing("Coca-Cola Soft Drink 50cl x 12", 6000, ["Grocery", "Beverages", "Soft Drinks"], "Coca-Cola");
    const [single] = scoreCandidates(coke, [
      listing("Coca-Cola Soft Drink 50cl x 24", 11000, ["Grocery", "Beverages", "Soft Drinks"], "Coca-Cola")
    ]);
    expect(single.match).toBe("variant");
    expect(single.unitPrice?.unit).toBe("litre");
    expect(single.reasons).toContain("cheaper per litre");

    const pampers = listing("Pampers Baby Dry Diapers Size 4 Maxi 64 Pcs", 21000, CAT.diapers, "Pampers");
    const [other] = scoreCandidates(pampers, [listing("Pampers Baby Dry Diapers Size 4 Maxi 32 Pcs", 11500, CAT.diapers, "Pampers")]);
    expect(other.match).toBe("variant");
    expect(other.unitPrice?.unit).toBe("piece");
  });
});

describe("fashion and structure-only fallback", () => {
  it("treats shoe care as related to sneakers, not as cheaper sneakers", () => {
    const shoe = listing("Nike Air Force 1 '07 Sneakers - White", 95000, CAT.sneakers, "Nike");
    expect(relateProducts(shoe, listing("Nike Air Force 1 Cleaning Kit", 8000, CAT.shoeCare, "Generic")).match).toBe("accessory");
    expect(relateProducts(shoe, listing("Nike Air Force 1 '07 Sneakers - White", 89000, CAT.sneakers, "Nike")).match).toBe("same-item");
  });

  it("uses 'X for Y' structure when categories are missing", () => {
    const blender = listing("Binatone BLG-416 Blender 1.5L", 32000, [], "Binatone");
    expect(relateProducts(blender, listing("Replacement Jar For Binatone BLG-416", 7000, [])).match).toBe("accessory");
    expect(relateProducts(blender, listing("Binatone BLG-416 Blender 1.5L", 30000, [], "Binatone")).match).toBe("same-item");
  });
});
