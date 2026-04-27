import { describe, expect, it } from "vitest";
import { parseProductPage, parseSearchResults } from "@marketplaces/jumia-ng/parser";

describe("jumia-ng parser", () => {
  it("extracts a product page with full specs", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{"@type":"Product","name":"Samsung 32-inch HD TV UA32T5300","brand":{"name":"Samsung"},"image":"https://img.test/tv.jpg","aggregateRating":{"ratingValue":"4.5","reviewCount":"120"},"offers":{"price":"150000","priceCurrency":"NGN"}}</script>
      </head><body>
        <nav class="brcbs"><a>Electronics</a><a>Televisions</a></nav>
        <section><h2>Product details</h2><ul><li>Model: UA32T5300</li><li>Screen Size: 32 inch</li><li>Dimensions: 73 x 43 x 8 cm</li></ul></section>
        <p>Seller: Samsung Official Store</p>
      </body></html>`;

    const product = parseProductPage(html, "https://www.jumia.com.ng/tv.html");

    expect(product).toMatchObject({
      title: "Samsung 32-inch HD TV UA32T5300",
      brand: "Samsung",
      categoryPath: ["Electronics", "Televisions"],
      price: { amount: 150000, currency: "NGN", raw: "150000" },
      rating: 4.5,
      reviewCount: 120,
      seller: "Samsung Official Store",
      dimensions: { widthCm: 73, heightCm: 43, depthCm: 8 }
    });
    expect(product.specs.model).toBe("UA32T5300");
  });

  it("handles product pages with missing dimensions and reviews", () => {
    const html = `
      <html><body>
        <h1 class="-fs20">Binatone Blender 1.5L</h1>
        <span class="-b -ltr -tal -fs24">₦ 25,500</span>
        <div class="-pvxs">Brand: Binatone</div>
        <section><h2>Specifications</h2><p>Capacity: 1.5L</p></section>
      </body></html>`;

    const product = parseProductPage(html, "https://www.jumia.com.ng/blender.html");

    expect(product.title).toBe("Binatone Blender 1.5L");
    expect(product.reviewCount).toBeUndefined();
    expect(product.dimensions).toBeUndefined();
    expect(product.specs.capacity).toBe("1.5L");
  });

  it("extracts search results while ignoring sponsored/noisy cards without product links", () => {
    const html = `
      <article class="prd _fb">
        <a href="/samsung-tv.html"><img data-src="https://img.test/tv.jpg"><h3 class="name">Samsung 32-inch HD TV</h3><div class="prc">₦132,000</div><div class="rev">62 reviews</div></a>
      </article>
      <article class="spon"><span>Sponsored banner</span></article>
      <article class="prd">
        <a href="/generic-box.html"><h3 class="name">Generic Storage Box</h3><div class="prc">₦8,000</div></a>
      </article>`;

    const results = parseSearchResults(html, "https://www.jumia.com.ng/catalog/?q=tv");

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      title: "Samsung 32-inch HD TV",
      url: "https://www.jumia.com.ng/samsung-tv.html",
      price: { amount: 132000, currency: "NGN", raw: "₦132,000" },
      reviewCount: 62
    });
  });
});
