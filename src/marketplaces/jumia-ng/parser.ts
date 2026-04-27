import { parseMoney } from "@core/parsers/price";
import type { Dimensions, ProductSnapshot } from "@core/types";

export function parseProductPage(html: string, url: string): ProductSnapshot {
  const doc = parseHtml(html);
  const structured = extractLdProduct(doc);
  const text = doc.body.textContent ?? "";
  const specs = extractSpecs(doc);
  const title = structured.name ?? textFrom(doc, "h1, .-fs20, [data-product-name]") ?? "Unknown product";
  const brand =
    structured.brand ??
    matchText(text, /brand:\s*([^\n\r|]+)/i) ??
    textFrom(doc, "[data-brand]");
  const seller = matchText(text, /seller:\s*([^\n\r|]+)/i);
  const price =
    parseMoney(structured.price) ??
    parseMoney(textFrom(doc, ".-b.-ltr.-tal.-fs24, .prc, [data-price]"));

  return {
    title: clean(title),
    url,
    imageUrl: structured.image,
    price,
    brand: brand ? clean(brand) : undefined,
    categoryPath: [...doc.querySelectorAll(".brcbs a, nav a")]
      .map((node) => clean(node.textContent ?? ""))
      .filter(Boolean),
    rating: structured.rating,
    reviewCount: structured.reviewCount,
    seller: seller ? clean(seller) : undefined,
    specs,
    dimensions: extractDimensions(`${text} ${Object.values(specs).join(" ")}`),
    source: "detail"
  };
}

export function parseSearchResults(html: string, requestUrl: string): ProductSnapshot[] {
  const doc = parseHtml(html);
  return [...doc.querySelectorAll("article, .prd")]
    .map<ProductSnapshot | undefined>((card) => {
      const link = card.querySelector<HTMLAnchorElement>("a[href*='.html'], a[href^='/']");
      const title = textFrom(card, ".name, h3, h2") ?? link?.textContent;
      if (!link || !title) return undefined;
      const href = new URL(link.getAttribute("href") ?? "", requestUrl).toString();
      const reviewText = textFrom(card, ".rev, .stars") ?? "";
      return {
        title: clean(title),
        url: href,
        imageUrl:
          card.querySelector<HTMLImageElement>("img")?.dataset.src ??
          card.querySelector<HTMLImageElement>("img")?.src,
        price: parseMoney(textFrom(card, ".prc, [data-price]")),
        categoryPath: [],
        reviewCount: parseIntOrUndefined(reviewText.match(/(\d+)\s+reviews?/i)?.[1]),
        specs: {},
        source: "search"
      } satisfies ProductSnapshot;
    })
    .filter((product): product is ProductSnapshot => Boolean(product));
}

function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function extractLdProduct(doc: Document): {
  name?: string;
  brand?: string;
  image?: string;
  price?: string;
  rating?: number;
  reviewCount?: number;
} {
  for (const script of doc.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.textContent ?? "{}");
      const product = Array.isArray(data) ? data.find((item) => item["@type"] === "Product") : data;
      if (product?.["@type"] !== "Product") continue;
      return {
        name: product.name,
        brand: typeof product.brand === "string" ? product.brand : product.brand?.name,
        image: Array.isArray(product.image) ? product.image[0] : product.image,
        price: product.offers?.price,
        rating: numberOrUndefined(product.aggregateRating?.ratingValue),
        reviewCount: parseIntOrUndefined(product.aggregateRating?.reviewCount)
      };
    } catch {
      continue;
    }
  }
  return {};
}

function extractSpecs(doc: Document): Record<string, string> {
  const specs: Record<string, string> = {};
  const candidates = [...doc.querySelectorAll("li, p, tr")].map((node) => clean(node.textContent ?? ""));
  for (const line of candidates) {
    const match = line.match(/^([^:]{2,40}):\s*(.{1,100})$/);
    if (!match) continue;
    specs[normalizeKey(match[1])] = clean(match[2]);
  }
  return specs;
}

function extractDimensions(text: string): Dimensions | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*cm/i);
  if (!match) return undefined;
  return {
    widthCm: Number(match[1]),
    heightCm: Number(match[2]),
    depthCm: Number(match[3])
  };
}

function textFrom(root: ParentNode, selector: string): string | undefined {
  const value = root.querySelector(selector)?.textContent;
  return value ? clean(value) : undefined;
}

function matchText(text: string, pattern: RegExp): string | undefined {
  return text.match(pattern)?.[1];
}

function parseIntOrUndefined(value: unknown): number | undefined {
  const number = Number.parseInt(String(value), 10);
  return Number.isFinite(number) ? number : undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeKey(value: string): string {
  return clean(value).toLowerCase();
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
