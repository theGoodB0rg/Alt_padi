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

const NORMALIZE_TOKEN: Record<string, string> = {
  cell: "phone",
  mobile: "phone",
  cellphone: "phone",
  rotating: "rotatable",
  rotate: "rotatable",
  folding: "foldable",
  bracket: "holder"
};

export function tokenizeTitle(title: string): string[] {
  return title
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/(rotatable)(phone)/g, "$1 $2")
    .replace(/(holder)(retractable)/g, "$1 $2")
    .replace(/(\d+)\s*-\s*(inch|inches|cm|mm|kg|gb|tb|l)\b/g, "$1$2")
    .replace(/(\d+)\s+(inch|inches|cm|mm|kg|gb|tb|l)\b/g, "$1$2")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((token) => NORMALIZE_TOKEN[token.trim()] ?? token.trim())
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
