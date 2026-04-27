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
    parseMoney(textFrom(doc, "[data-price='true'], [data-price], .-b.-ubpt.-tal.-fs24, .prc"));

  return {
    title: clean(title),
    url,
    imageUrl: structured.image,
    price,
    brand: brand ? clean(brand) : undefined,
    categoryPath: [...doc.querySelectorAll(".brcbs a")]
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
  return [...doc.querySelectorAll("article.prd, article.c-prd")]
    .map<ProductSnapshot | undefined>((card) => {
      const link = card.querySelector<HTMLAnchorElement>("a.core[href*='.html'], a[href*='.html']:not(.btn):not([rel='nofollow'])");
      const title = textFrom(card, ".name") ?? link?.querySelector("img")?.getAttribute("alt");
      if (!link || !title) return undefined;
      const href = new URL(link.getAttribute("href") ?? "", requestUrl).toString();
      const reviewText = textFrom(card, ".rev") ?? "";
      return {
        title: clean(title),
        url: href,
        imageUrl:
          card.querySelector<HTMLImageElement>("a.core img")?.dataset.src ??
          card.querySelector<HTMLImageElement>("a.core img")?.src,
        price: parseMoney(textFrom(card, "a.core .prc, a.core [data-price], .prc, [data-price]")),
        categoryPath: [],
        rating: numberOrUndefined(reviewText.match(/([0-9.]+)\s+out of 5/i)?.[1]),
        reviewCount: parseIntOrUndefined(
          reviewText.match(/\((\d+)\)/)?.[1] ?? reviewText.match(/(\d+)\s+reviews?/i)?.[1]
        ),
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
      const product = findStructuredProduct(data);
      if (!product) continue;
      return {
        name: product.name,
        brand: typeof product.brand === "string" ? product.brand : product.brand?.name,
        image: extractStructuredImage(product.image),
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

type StructuredProduct = {
  ["@type"]?: string;
  ["@graph"]?: unknown[];
  name?: string;
  brand?: string | { name?: string };
  image?: unknown;
  offers?: { price?: string };
  aggregateRating?: { ratingValue?: unknown; reviewCount?: unknown };
};

function findStructuredProduct(data: unknown): StructuredProduct | undefined {
  if (Array.isArray(data)) return data.map(findStructuredProduct).find(Boolean);
  if (!data || typeof data !== "object") return undefined;
  const value = data as StructuredProduct;
  if (value["@type"] === "Product") return value;
  if (Array.isArray(value["@graph"])) return value["@graph"].find((item): item is StructuredProduct => Boolean(item && typeof item === "object" && (item as StructuredProduct)["@type"] === "Product"));
  return undefined;
}

function extractStructuredImage(image: unknown): string | undefined {
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return typeof image[0] === "string" ? image[0] : extractStructuredImage(image[0]);
  if (image && typeof image === "object") {
    const value = image as { contentUrl?: string | string[]; url?: string | string[] };
    const url = value.contentUrl ?? value.url;
    return Array.isArray(url) ? url[0] : url;
  }
  return undefined;
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
