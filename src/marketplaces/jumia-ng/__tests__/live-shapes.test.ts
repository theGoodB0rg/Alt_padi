import { describe, expect, it } from "vitest";
import { parseProductPage, parseSearchResults } from "@marketplaces/jumia-ng/parser";

describe("jumia-ng live HTML shapes", () => {
  it("extracts price and rating from @graph JSON-LD product pages", () => {
    const html = `
      <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Product","name":"180 °RotatablePhone HolderRetractable Disc Base Phone Stand","brand":{"name":"Generic"},"offers":{"@type":"Offer","price":"3278.00","priceCurrency":"NGN"},"aggregateRating":{"ratingValue":"4.2","reviewCount":"351"},"image":{"@type":"ImageObject","contentUrl":["https://img.test/phone-stand.jpg"]}}]}</script>
      <div class="brcbs"><a>Phones & Tablets</a><a>Mounts & Stands</a></div>
      <nav><a>Account</a><a>Cart</a></nav>
    `;

    const product = parseProductPage(html, "https://www.jumia.com.ng/product.html");

    expect(product.price).toEqual({ amount: 3278, currency: "NGN", raw: "3278.00" });
    expect(product.rating).toBe(4.2);
    expect(product.reviewCount).toBe(351);
    expect(product.imageUrl).toBe("https://img.test/phone-stand.jpg");
    expect(product.categoryPath).toEqual(["Phones & Tablets", "Mounts & Stands"]);
  });

  it("parses only real product cards and ignores wishlist/filter links", () => {
    const html = `
      <section><a href="/computing/?q=phone+stand">Category</a></section>
      <article class="prd _fb col c-prd">
        <a role="button" href="/customer/account/login/?tkWl=abc" class="btn _i">wishlist</a>
        <a href="/generic-phone-stand-123.html" class="core"><div class="img-c"><img data-src="https://img.test/a.jpg" alt="Phone Stand" /></div><div class="info"><h3 class="name">180 °Rotatable Phone Holder Retractable Disc Base Phone Stand</h3><div class="prc">₦ 5,000</div><div class="rev"><div class="stars _s">4.1 out of 5</div>(24)</div></div></a>
      </article>`;

    const results = parseSearchResults(html, "https://www.jumia.com.ng/catalog/?q=phone+stand");

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      title: "180 °Rotatable Phone Holder Retractable Disc Base Phone Stand",
      url: "https://www.jumia.com.ng/generic-phone-stand-123.html",
      price: { amount: 5000, currency: "NGN", raw: "₦ 5,000" },
      rating: 4.1,
      reviewCount: 24
    });
  });
});
