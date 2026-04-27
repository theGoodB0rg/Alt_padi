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

export function tokenizeTitle(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/(\d+)\s*-\s*(inch|inches|cm|mm|kg|gb|tb|l)\b/g, "$1$2")
    .replace(/(\d+)\s+(inch|inches|cm|mm|kg|gb|tb|l)\b/g, "$1$2")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !NOISE.has(token));
}

export function similarity(left: string, right: string): number {
  const a = new Set(tokenizeTitle(left));
  const b = new Set(tokenizeTitle(right));
  if (a.size === 0 || b.size === 0) return 0;

  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}
