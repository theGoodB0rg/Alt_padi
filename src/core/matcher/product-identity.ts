import { describeQuantityDifference, isUnitWord, readQuantities, type QuantityInfo } from "@core/parsers/quantity";
import { tokenizeTitle } from "@core/parsers/tokenizer";
import type { MatchKind, ProductSnapshot } from "@core/types";

/**
 * Product identity: "what IS this listing, and is it the thing the user is looking at?"
 *
 * Deliberately vocabulary-free. Nothing here knows what a phone, a pouch or a bag of rice is.
 * It relies on signals that exist for every product on a marketplace:
 *
 * 1. The marketplace's own category tree. A listing filed under ".../Accessories/Cases" is not
 *    the same kind of thing as one under ".../Mobile Phones/Smartphones", whatever its title says.
 *    Groceries, fashion and furniture are categorised the same way.
 * 2. Sentence structure. "<X> for <Y>" / "<X> compatible with <Y>" means X is made for Y, not Y.
 * 3. Identifiers. Brand plus model codes ("N1", "A15", "UA32T5300", "Spark 20") pin down an item.
 * 4. Quantities. Same identity with a different size/capacity/pack count is a variant.
 */

export interface ProductIdentity {
  brand?: string;
  /** Lower-cased model identifiers: "n1", "a15", "spark20". */
  modelCodes: string[];
  /** Line qualifiers that make a different model: "pro", "max", "lite"... */
  modifiers: string[];
  /** Remaining descriptive words of what is being sold (no brand, codes, numbers). */
  descriptors: string[];
  /** True when the title reads "<thing> for/compatible with <other thing>". */
  madeForSomethingElse: boolean;
  quantities: QuantityInfo;
}

/** Words that, after a model name, denote a different model in the same line. Retail-wide, not category-specific. */
const MODIFIERS = new Set(["pro", "max", "ultra", "plus", "lite", "mini", "prime", "neo", "se", "fe", "xl", "xxl", "air", "edge"]);
/** Words that precede a number without forming a model name ("size 4", "pack 2", "android 13"). */
const NOT_SERIES = new Set([
  "size", "pack", "pcs", "pieces", "piece", "set", "of", "version", "year", "years", "x", "in", "gen", "and",
  "up", "to", "android", "ios", "windows", "no", "number", "vol", "volume", "part", "step", "stage", "age", "for"
]);
const UNBRANDED = new Set(["generic", "unbranded", "no brand", "oem", "other", "others"]);
const MADE_FOR = /\s(?:for|compatible with|suitable for|fits|fit for|designed for|replacement for)\s/;

export function identifyProduct(product: ProductSnapshot): ProductIdentity {
  const title = stripFreebies(product.title);
  const brand = normaliseBrand(product.brand);
  const tokens = withoutBrand(tokenizeTitle(title), brand);
  const modelCodes = extractModelCodes(tokens);
  const codeParts = new Set(modelCodes.flatMap((code) => [code, code.replace(/\d+[a-z]*$/, "")]));
  const modifiers = tokens.filter((token) => MODIFIERS.has(token));

  return {
    brand,
    modelCodes,
    modifiers: [...new Set(modifiers)],
    descriptors: [
      ...new Set(tokens.filter((token) => !/\d/.test(token) && !codeParts.has(token) && !MODIFIERS.has(token)))
    ],
    madeForSomethingElse: MADE_FOR.test(` ${title.toLowerCase()} `),
    quantities: readQuantities(`${title} ${Object.values(product.specs).join(" ")}`)
  };
}

export interface Relationship {
  match: MatchKind;
  reason?: string;
  warning?: string;
}

/**
 * How does a candidate relate to what the user is viewing?
 * - same-item:   same product (brand, model, size/config)
 * - variant:     same product, different size / capacity / pack
 * - alternative: same kind of product, different model or brand
 * - accessory:   a different kind of product made for or named after the item (case, refill, part...)
 * - unrelated:   a different kind of product altogether
 */
export function relateProducts(source: ProductSnapshot, candidate: ProductSnapshot): Relationship {
  const a = identifyProduct(source);
  const b = identifyProduct(candidate);
  const type = compareCategories(source.categoryPath, candidate.categoryPath);
  const namedAfterSource = mentionsIdentity(candidate, a);

  if (type === "different") {
    const leaf = candidate.categoryPath.at(-1);
    // Sharing only a brand-like name ("Big Bull" rice vs a "Big Bull" wall frame) proves nothing;
    // a model code, "made for" wording, or the same manufacturer does.
    const related =
      namedAfterSource &&
      (a.modelCodes.length > 0 || b.madeForSomethingElse || (!!a.brand && a.brand === b.brand && !UNBRANDED.has(a.brand)));
    return related
      ? { match: "accessory", warning: `made for the item${leaf ? ` (${leaf})` : ""}, not the item itself` }
      : { match: "unrelated", warning: `different category${leaf ? ` (${leaf})` : ""}` };
  }

  // No usable category: fall back to sentence structure. "X for <the item>" is not the item.
  if (type === "unknown" && b.madeForSomethingElse && !a.madeForSomethingElse && namedAfterSource) {
    return { match: "accessory", warning: "made for the item, not the item itself" };
  }

  if (!sameIdentity(a, b)) {
    // An alternative must share something real with the item: a specific category, or the
    // item's own descriptive words. Otherwise a broad search returns whisky for spaghetti.
    const specificCategory = (type === "same" && cleanPath(source.categoryPath).length >= 3) || type === "sibling";
    const sharedWords = sharesDescriptor(a, b);
    if (!specificCategory && !sharedWords) return { match: "unrelated", warning: "nothing in common with the item" };
    return { match: "alternative" };
  }

  const difference = describeQuantityDifference(a.quantities, b.quantities);
  if (difference) return { match: "variant", warning: `different variant: ${difference}` };
  return { match: "same-item", reason: a.modelCodes.length ? "same model" : "same product" };
}

export type CategoryRelation = "same" | "sibling" | "different" | "unknown";

export function compareCategories(source: string[], candidate: string[]): CategoryRelation {
  const a = cleanPath(source);
  const b = cleanPath(candidate);
  if (!a.length || !b.length) return "unknown";
  let common = 0;
  while (common < a.length && common < b.length && a[common] === b[common]) common += 1;
  const shorter = Math.min(a.length, b.length);
  if (a.at(-1) === b.at(-1) && a.length > 1 && b.length > 1) return "same";
  // A bare department ("Grocery") contains everything from rice to whisky: it says nothing.
  if (shorter < 2) return common === shorter ? "unknown" : "different";
  if (common === shorter) return "same";
  // Siblings under the same specific parent (e.g. "Cases" vs "Flip Cases", "Rice" vs "Beans").
  if (common >= Math.max(2, shorter - 1)) return "sibling";
  return "different";
}

function cleanPath(path: string[]): string[] {
  return path.map((part) => part.trim().toLowerCase()).filter((part) => part && part !== "home");
}

function sameIdentity(a: ProductIdentity, b: ProductIdentity): boolean {
  if (a.brand && b.brand && a.brand !== b.brand) return false;
  // A branded item and an unbranded listing using its name are not the same product.
  if (a.brand && !UNBRANDED.has(a.brand) && b.brand && UNBRANDED.has(b.brand)) return false;

  if (a.modelCodes.length) {
    const codes = new Set(b.modelCodes);
    if (!a.modelCodes.every((code) => codes.has(code))) return false;
    return a.modifiers.length === b.modifiers.length && a.modifiers.every((m) => b.modifiers.includes(m));
  }

  // No model code (food, fashion, home goods): same brand and near-identical description.
  if (!a.brand || !b.brand) return false;
  return jaccard(a.descriptors, b.descriptors) >= 0.6;
}

function mentionsIdentity(candidate: ProductSnapshot, source: ProductIdentity): boolean {
  const tokens = tokenizeTitle(candidate.title);
  const present = new Set(tokens);
  if (source.modelCodes.length) {
    const codes = new Set(extractModelCodes(tokens));
    return source.modelCodes.some((code) => codes.has(code) || present.has(code));
  }
  if (source.brand && !UNBRANDED.has(source.brand)) return tokenizeTitle(source.brand).every((part) => present.has(part));
  return false;
}

function sharesDescriptor(a: ProductIdentity, b: ProductIdentity): boolean {
  const stems = new Set(b.descriptors.filter((word) => word.length > 2).map(stem));
  return a.descriptors.some((word) => word.length > 2 && stems.has(stem(word)));
}

/** Minimal English stemming so "rotating"/"rotatable" and "cases"/"case" line up. */
export function stem(word: string): string {
  return word.replace(/(able|ible|ing|ed|es|s)$/, "").replace(/e$/, "");
}

/** Remove the brand's words ("big bull", "agm") wherever and however often they appear. */
function withoutBrand(tokens: string[], brand?: string): string[] {
  if (!brand) return tokens;
  const parts = new Set(tokenizeTitle(brand));
  return tokens.filter((token) => !parts.has(token));
}

/**
 * Model identifiers from (brand-free) title tokens. Handles coded models ("n1", "a15",
 * "ua32t5300", "40i") and series+number models ("spark 20" -> "spark20", "iphone 15" -> "iphone15").
 */
export function extractModelCodes(tokens: string[]): string[] {
  const codes: string[] = [];
  tokens.forEach((token, index) => {
    if (isModelCode(token)) {
      codes.push(token);
      return;
    }
    const previous = tokens[index - 1];
    const next = tokens[index + 1];
    // "Spaghetti 20 Sachets": a number followed by a count/unit word is a quantity, not a model.
    const isQuantity = next !== undefined && isUnitWord(next);
    if (
      /^\d{1,4}$/.test(token) &&
      !isQuantity &&
      previous &&
      /^[a-z]{2,}$/.test(previous) &&
      !NOT_SERIES.has(previous) &&
      !isUnitWord(previous) // "Sachets (1 Carton)" is not model "sachets 1"
    ) {
      codes.push(`${previous}${token}`);
    }
  });
  return [...new Set(codes)];
}

function isModelCode(token: string): boolean {
  if (!/[a-z]/.test(token) || !/\d/.test(token)) return false;
  // Quantities such as "50kg", "8gb", "6.5inch", "4g" are not model names.
  const quantity = readQuantities(token);
  if (Object.keys(quantity.specs).length) return false;
  return !/^\d+(st|nd|rd|th|x)$/.test(token);
}

/** Search phrase for the model, e.g. "AGM Note N1 8GB 256GB" -> "note n1", "Tecno Spark 20 Pro" -> "spark 20 pro". */
export function modelPhrase(product: ProductSnapshot): string | undefined {
  const tokens = withoutBrand(tokenizeTitle(stripFreebies(product.title)), normaliseBrand(product.brand));
  const firstCode = extractModelCodes(tokens)[0];
  if (!firstCode) return undefined;
  let codeIndex = tokens.indexOf(firstCode);
  if (codeIndex < 0) codeIndex = tokens.findIndex((token, i) => i > 0 && `${tokens[i - 1]}${token}` === firstCode);
  if (codeIndex < 0) return undefined;
  const isSeriesCode = tokens[codeIndex] !== firstCode;
  // Titles lead with the line name ("Galaxy A15", "Note N1"): keep the words before an early code.
  let start = codeIndex <= 2 ? 0 : isSeriesCode ? codeIndex - 1 : codeIndex;
  while (start < codeIndex && /\d/.test(tokens[start])) start += 1;
  let end = codeIndex + 1;
  while (end < tokens.length && MODIFIERS.has(tokens[end])) end += 1;
  return tokens.slice(start, end).join(" ");
}

export function isUnbranded(brand?: string): boolean {
  return !brand || UNBRANDED.has(brand.toLowerCase());
}

/** Drop "+ Free Pouch", "with free gift"... so freebies are not mistaken for the product. */
function stripFreebies(text: string): string {
  return text
    .replace(/(?:\+|&|\bwith\b|\bw\/|\bplus\b)?\s*\b(free|gift|bonus|complimentary)\b.*$/i, " ")
    // Trailing " - Black" / " - Gravity Blue": a colour/finish suffix, not part of what is sold.
    .replace(/\s[-–]\s(?:[a-z]+\s?){1,3}$/i, " ");
}

/**
 * The head noun phrase of what is being sold, from the title's own words. In retail titles the
 * thing itself comes last before any "for/with" clause: "Disc Base Phone Stand" -> "phone stand",
 * "Premium Parboiled Rice 50kg" -> "parboiled rice", "Men's Leather Loafers" -> "leather loafers".
 */
export function headNounPhrase(product: ProductSnapshot): string | undefined {
  const title = ` ${stripFreebies(product.title).toLowerCase()} `;
  const head = title.split(MADE_FOR)[0].split(/\s(?:with|w\/|\+|&)\s/)[0];
  const descriptors = new Set(identifyProduct({ ...product, title: head }).descriptors);
  const tokens = tokenizeTitle(head);
  // A word right after a quantity describes the quantity ("8GB RAM", "64 pcs pack"), not the product.
  const words = tokens.filter((token, index) => descriptors.has(token) && !/\d/.test(tokens[index - 1] ?? ""));
  return words.length ? words.slice(-2).join(" ") : undefined;
}

function normaliseBrand(brand?: string): string | undefined {
  const value = brand?.trim().toLowerCase();
  return value || undefined;
}

function jaccard(left: string[], right: string[]): number {
  const a = new Set(left);
  const b = new Set(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / new Set([...a, ...b]).size;
}
