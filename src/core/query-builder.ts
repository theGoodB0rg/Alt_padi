import { tokenizeTitle } from "@core/parsers/tokenizer";
import type { ProductSnapshot } from "@core/types";

const PRODUCT_TERMS = ["tv", "television", "phone", "laptop", "blender", "shoe", "watch"];
const PLACEHOLDER_VALUES = new Set(["....", "...", "n/a", "na", "none", "-"]);

export function buildSearchQueries(product: ProductSnapshot): string[] {
  const brand = product.brand?.trim();
  const model = findModel(product);
  const size = findSpecValue(product, ["size", "screen size", "display", "capacity"]);
  const tokens = tokenizeTitle(product.title);
  const productTerm = inferProductTerm(tokens, product.categoryPath);

  if (!brand && !model && productTerm === "phone" && tokens.includes("holder") && tokens.includes("stand")) {
    return buildPhoneStandQueries(tokens);
  }

  const nonBrandTokens = tokens.filter((token) => token !== brand?.toLowerCase());
  const nonModelTokens = nonBrandTokens.filter((token) => token !== model?.toLowerCase());
  const queries = [
    [brand, model].filter(Boolean).join(" "),
    [brand, size, productTerm].filter(Boolean).join(" "),
    [model, ...nonModelTokens.slice(0, 3)].filter(Boolean).join(" "),
    [brand, ...tokens.filter((token) => token !== "official").slice(1, 4)].filter(Boolean).join(" ")
  ];

  return [...new Set(queries.map((query) => query.trim()).filter(Boolean))].slice(0, 4);
}

function buildPhoneStandQueries(tokens: string[]): string[] {
  const hasRotatable = tokens.includes("rotatable") || tokens.includes("rotating");
  const hasRetractable = tokens.includes("retractable");
  const queries = [
    hasRotatable ? "rotatable phone holder stand" : "phone holder stand",
    hasRetractable ? "phone holder retractable stand" : "phone stand holder",
    "mobile phone holder stand",
    "phone stand"
  ];
  return [...new Set(queries)];
}

function findModel(product: ProductSnapshot): string | undefined {
  const model = findSpecValue(product, ["model", "model number"]);
  if (model && !isPlaceholder(model)) return model;
  return tokenizeTitle(product.title).find((token) => /[a-z]+\d|\d+[a-z]+/i.test(token));
}

function findSpecValue(product: ProductSnapshot, keys: string[]): string | undefined {
  const entries = Object.entries(product.specs);
  const match = entries.find(([key]) => keys.includes(key.toLowerCase()));
  const value = match?.[1]?.trim();
  return value && !isPlaceholder(value) ? value : undefined;
}

function inferProductTerm(tokens: string[], categoryPath: string[]): string | undefined {
  if (tokens.includes("tv")) return "television";
  const fromTitle = PRODUCT_TERMS.find((term) => tokens.includes(term));
  if (fromTitle) return fromTitle;
  const category = categoryPath.at(-1)?.toLowerCase();
  if (!category) return undefined;
  if (category.includes("television")) return "television";
  return category.replace(/[^a-z0-9]+/g, " ").split(/\s+/)[0];
}

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_VALUES.has(value.trim().toLowerCase());
}
