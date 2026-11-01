/**
 * Category-agnostic quantity reading. Works the same for "Mama Gold Rice 50kg", "Coke 50cl x 12",
 * "Pampers Size 4 (64 pcs)", "8GB RAM 256GB ROM" or "Bed Sheet 6x6".
 *
 * Two outputs:
 * - specs: every number+unit pair, grouped by unit. Two listings that share a unit but disagree on
 *   its value are variants of each other (50kg vs 25kg, 128GB vs 256GB, 1.5L vs 1L).
 * - measure: total mass / volume / count, used for price-per-unit comparison.
 */

type Dimension = "mass" | "volume" | "count" | "data";

const UNITS: Record<string, { dimension: Dimension; factor: number; label: string }> = {
  mg: { dimension: "mass", factor: 0.001, label: "g" },
  g: { dimension: "mass", factor: 1, label: "g" },
  gm: { dimension: "mass", factor: 1, label: "g" },
  gr: { dimension: "mass", factor: 1, label: "g" },
  grams: { dimension: "mass", factor: 1, label: "g" },
  kg: { dimension: "mass", factor: 1000, label: "kg" },
  kgs: { dimension: "mass", factor: 1000, label: "kg" },
  lb: { dimension: "mass", factor: 453.6, label: "lb" },
  lbs: { dimension: "mass", factor: 453.6, label: "lb" },
  ml: { dimension: "volume", factor: 1, label: "ml" },
  cl: { dimension: "volume", factor: 10, label: "cl" },
  l: { dimension: "volume", factor: 1000, label: "l" },
  ltr: { dimension: "volume", factor: 1000, label: "l" },
  ltrs: { dimension: "volume", factor: 1000, label: "l" },
  litre: { dimension: "volume", factor: 1000, label: "l" },
  litres: { dimension: "volume", factor: 1000, label: "l" },
  liter: { dimension: "volume", factor: 1000, label: "l" },
  liters: { dimension: "volume", factor: 1000, label: "l" },
  pcs: { dimension: "count", factor: 1, label: "pcs" },
  pc: { dimension: "count", factor: 1, label: "pcs" },
  pieces: { dimension: "count", factor: 1, label: "pcs" },
  piece: { dimension: "count", factor: 1, label: "pcs" },
  packs: { dimension: "count", factor: 1, label: "pcs" },
  pack: { dimension: "count", factor: 1, label: "pcs" },
  count: { dimension: "count", factor: 1, label: "pcs" },
  ct: { dimension: "count", factor: 1, label: "pcs" },
  sachets: { dimension: "count", factor: 1, label: "pcs" },
  rolls: { dimension: "count", factor: 1, label: "pcs" },
  tablets: { dimension: "count", factor: 1, label: "pcs" },
  capsules: { dimension: "count", factor: 1, label: "pcs" },
  mb: { dimension: "data", factor: 1 / 1024, label: "gb" },
  gb: { dimension: "data", factor: 1, label: "gb" },
  tb: { dimension: "data", factor: 1024, label: "gb" }
};

export interface QuantityInfo {
  /** unit label -> distinct values seen, e.g. { gb: [8, 256], inch: [6.52] } */
  specs: Record<string, number[]>;
  measure?: { dimension: "mass" | "volume" | "count"; base: number };
}

// The number must not be glued to a preceding letter/digit ("ua32t5300" is a model code, not 32t),
// and the unit must not run on into more letters or digits.
const NUMBER_UNIT = /(?<![a-z0-9.])(\d+(?:[.,]\d+)?)\s*(?:-\s*)?([a-z]{1,7}|"|'')(?![a-z0-9])/g;
const MULTIPLIER = [
  /\bx\s*(\d{1,3})\b/, // "50cl x 12", "(x2)"
  /\b(\d{1,3})\s*x\s*\d/, // "12 x 50cl"
  /\b(?:pack|box|carton|case|crate|bag|set|bundle) of\s*(\d{1,3})\b/,
  /\b(\d{1,3})\s*(?:per|in a|in one)\s*(?:pack|box|carton|case|crate)\b/,
  /\b(\d{1,3})\s*(?:-\s*)?(?:pack|pcs|pieces|in 1)\b/,
  /\bset of\s*(\d{1,3})\b/
];

export function readQuantities(text: string): QuantityInfo {
  const lower = text.toLowerCase().replace(/(\d),(\d{3})/g, "$1$2");
  const specs: Record<string, number[]> = {};
  let mass = 0;
  let volume = 0;

  for (const match of lower.matchAll(NUMBER_UNIT)) {
    const value = Number(match[1].replace(",", "."));
    if (!Number.isFinite(value) || value === 0) continue;
    const rawUnit = match[2] === '"' || match[2] === "''" ? "inch" : match[2];
    // "4G"/"5G" are network generations, not grams; nothing is sold by the single gram.
    if (rawUnit === "g" && value < 10 && Number.isInteger(value)) continue;
    const known = UNITS[rawUnit];
    const label = known?.label ?? normaliseFreeUnit(rawUnit);
    if (!label) continue;
    const list = (specs[label] ??= []);
    if (!list.includes(value)) list.push(value);

    if (known?.dimension === "mass" && !mass) mass = value * known.factor;
    if (known?.dimension === "volume" && !volume) volume = value * known.factor;
  }

  const multiplier = readMultiplier(lower);
  let measure: QuantityInfo["measure"];
  // "70g - 1 Carton": the 70g is one sachet and the carton count is unknown. A total we cannot
  // read is better left out than shown as a misleading per-kg price.
  const unknownOuterPack = !multiplier && /\b(carton|cartons|crate|crates|bale|bales|bundle|dozens)\b/.test(lower);
  if (unknownOuterPack) return { specs };
  if (mass) measure = { dimension: "mass", base: mass * (multiplier ?? 1) };
  else if (volume) measure = { dimension: "volume", base: volume * (multiplier ?? 1) };
  else if (specs.pcs?.length) measure = { dimension: "count", base: Math.max(...specs.pcs) };
  else if (multiplier) measure = { dimension: "count", base: multiplier };

  return { specs, measure };
}

function readMultiplier(text: string): number | undefined {
  if (/\b(?:a|1|one)?\s*dozen\b/.test(text)) return 12;
  for (const pattern of MULTIPLIER) {
    const value = Number(text.match(pattern)?.[1]);
    if (value > 1 && value < 1000) return value;
  }
  return undefined;
}

/** Keep short unit-like suffixes ("inch", "w", "mah", "hz", "cm") as free-form spec units; drop words. */
function normaliseFreeUnit(unit: string): string | undefined {
  if (unit === "inches" || unit === "in") return "inch";
  if (/^(st|nd|rd|th)$/.test(unit)) return undefined; // ordinals: "2nd gen"
  if (unit.length > 4 && unit !== "inch") return undefined;
  if (/^(x|and|or|to|for|of|in|by|per|year|yrs|days|hrs|min)$/.test(unit)) return undefined;
  return unit;
}

/** Human description of how a candidate's quantities differ from the source's, if they do. */
export function describeQuantityDifference(source: QuantityInfo, candidate: QuantityInfo): string | undefined {
  const parts: string[] = [];
  for (const [unit, sourceValues] of Object.entries(source.specs)) {
    const candidateValues = candidate.specs[unit];
    if (!candidateValues) continue;
    // Different only if each side has a value the other lacks (one listing may just omit a spec).
    const sourceOnly = sourceValues.some((v) => !candidateValues.some((w) => approxEqual(v, w)));
    const candidateOnly = candidateValues.some((v) => !sourceValues.some((w) => approxEqual(v, w)));
    if (sourceOnly && candidateOnly) {
      const fmt = (values: number[]) => [...values].sort((x, y) => x - y).join("/");
      parts.push(`${fmt(candidateValues)}${unit} vs ${fmt(sourceValues)}${unit}`);
    }
  }
  if (!parts.length && source.measure && candidate.measure && source.measure.dimension === candidate.measure.dimension) {
    const ratio = candidate.measure.base / source.measure.base;
    if (ratio < 0.95 || ratio > 1.05) parts.push(`${formatMeasure(candidate.measure)} vs ${formatMeasure(source.measure)}`);
  }
  return parts.length ? parts.join(", ") : undefined;
}

/** 6.5" vs 6.52" is the same screen; 50kg vs 25kg is not. */
function approxEqual(a: number, b: number): boolean {
  return Math.abs(a - b) / Math.max(a, b) <= 0.03;
}

export function unitPrice(price: number, quantity: QuantityInfo): { amount: number; unit: string } | undefined {
  const measure = quantity.measure;
  if (!measure || measure.base <= 0) return undefined;
  if (measure.dimension === "mass") return { amount: (price / measure.base) * 1000, unit: "kg" };
  if (measure.dimension === "volume") return { amount: (price / measure.base) * 1000, unit: "litre" };
  if (measure.base > 1) return { amount: price / measure.base, unit: "piece" };
  return undefined;
}

function formatMeasure(measure: NonNullable<QuantityInfo["measure"]>): string {
  if (measure.dimension === "mass") return measure.base >= 1000 ? `${measure.base / 1000}kg` : `${measure.base}g`;
  if (measure.dimension === "volume") return measure.base >= 1000 ? `${measure.base / 1000}L` : `${measure.base}ml`;
  return `${measure.base} pcs`;
}

const OTHER_UNIT_WORDS = new Set(["inch", "inches", "cm", "mm", "m", "w", "watts", "mah", "v", "volts", "hz", "oz"]);

/** True for recognised measurement/count words ("kg", "sachets", "pcs", "inch"), never for words like "pro". */
export function isUnitWord(word: string): boolean {
  const lower = word.toLowerCase();
  return lower in UNITS || OTHER_UNIT_WORDS.has(lower);
}
