import { headNounPhrase, identifyProduct, isUnbranded, modelPhrase } from "@core/matcher/product-identity";
import { readQuantities } from "@core/parsers/quantity";
import { tokenizeTitle } from "@core/parsers/tokenizer";
import type { ProductSnapshot, SearchIntent } from "@core/types";

const PLACEHOLDER_VALUES = new Set(["....", "...", "n/a", "na", "none", "-"]);

/**
 * Plan searches from the item's own identity, for any kind of product:
 * 1. the item by name, inside its own category  -> other sellers of the same thing, no accessories
 * 2. the item by name + size/capacity            -> the exact configuration
 * 3. the item by name, whole store               -> mis-filed listings and related add-ons
 * 4. what the item is, inside its category       -> reasonable alternatives from other brands/models
 */
export function buildSearchIntents(product: ProductSnapshot): SearchIntent[] {
  const brand = product.brand && !isUnbranded(product.brand) ? product.brand.trim() : undefined;
  const identity = identifyProduct(product);
  const model = findSpecModel(product) ?? modelPhrase(product);
  const descriptors = identity.descriptors.filter((word) => word !== brand?.toLowerCase());
  const quantities = tokenizeTitle(product.title)
    .filter((token) => /\d/.test(token) && Object.keys(readQuantities(token).specs).length > 0)
    .slice(0, 2);

  // Without a brand, the description has to carry the whole identity: use one more word.
  const name = model ? join(brand, model) : join(brand, ...descriptors.slice(0, brand ? 2 : 3));
  const what = headNounPhrase(product) || product.categoryPath.at(-1) || name;

  const intents: SearchIntent[] = [
    { query: name, scope: "category" },
    { query: join(name, ...quantities), scope: "category" },
    // The brand inside the category catches the same product listed under different wording.
    ...(brand && !model ? [{ query: brand, scope: "category" as const }] : []),
    { query: name, scope: "all" },
    { query: what, scope: "category" }
  ];

  const seen = new Set<string>();
  return intents.filter((intent) => {
    const key = `${intent.scope}:${intent.query.toLowerCase()}`;
    if (!intent.query || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Query strings only, for display and tests. */
export function buildSearchQueries(product: ProductSnapshot): string[] {
  return [...new Set(buildSearchIntents(product).map((intent) => intent.query))];
}

function join(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function findSpecModel(product: ProductSnapshot): string | undefined {
  const entry = Object.entries(product.specs).find(([key]) => ["model", "model number"].includes(key.toLowerCase()));
  const value = entry?.[1]?.trim();
  return value && !PLACEHOLDER_VALUES.has(value.toLowerCase()) ? value : undefined;
}
