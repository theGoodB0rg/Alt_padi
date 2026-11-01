const NOISE = new Set([
  "official",
  "store",
  "with",
  "and",
  "for",
  "the",
  "new",
  "original",
  "promo",
  "sale",
  "free",
  "shipping"
]);

/** Measurement units, glued to their number so "32 inch" and "32-inch" become one token. */
const UNIT = "(?:inch|inches|cm|mm|m|kg|g|mg|l|ml|cl|ltr|litres?|gb|tb|mb|mah|w|v|hz|pcs|oz|lbs?)";

export function tokenizeTitle(title: string): string[] {
  return title
    // Casing that is not a word boundary: units ("5000mAh") and i-prefixed names ("iPhone").
    .replace(/(\d)\s*(mAh|kWh|mWh)\b/g, (_m, d: string, unit: string) => `${d}${unit.toLowerCase()}`)
    .replace(/\bi([A-Z][a-z]+)/g, (_m, rest: string) => `i${rest.toLowerCase()}`)
    // Glued words from marketplace titles: "RotatablePhone HolderRetractable".
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*-?\\s*(${UNIT})\\b`, "g"), "$1$2")
    // Keep decimals ("6.52", "1.5l") intact; everything else non-alphanumeric is a separator.
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\.(?!\d)|(?<!\d)\./g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => (token.length > 1 || /\d/.test(token)) && !NOISE.has(token));
}

export function similarity(left: string, right: string): number {
  const a = new Set(tokenizeTitle(left));
  const b = new Set(tokenizeTitle(right));
  if (a.size === 0 || b.size === 0) return 0;

  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}
