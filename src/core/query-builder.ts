import type { ProductSnapshot } from "@core/types";
import { tokenizeTitle } from "@core/parsers/tokenizer";

const PRODUCT_TERMS = ["tv", "television", "phone", "laptop", "blender", "shoe", "watch"];

export function buildSearchQueries(product: ProductSnapshot): string[] {
  const brand = product.brand?.trim();
  const model = findModel(product);
  const size = findSpecValue(product, ["size", "screen size", "display", "capacity"]);
  const tokens = tokenizeTitle(product.title);
  const productTerm = inferProductTerm(tokens, product.categoryPath);
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

function findModel(product: ProductSnapshot): string | undefined {
  const model = findSpecValue(product, ["model", "model number", "sku"]);
  if (model) return model;
  return tokenizeTitle(product.title).find((token) => /[a-z]+\d|\d+[a-z]+/i.test(token));
}

function findSpecValue(product: ProductSnapshot, keys: string[]): string | undefined {
  const entries = Object.entries(product.specs);
  const match = entries.find(([key]) => keys.includes(key.toLowerCase()));
  return match?.[1];
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
