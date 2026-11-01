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

  it("reads the seller name and seller score from product pages", () => {
    const html = `
      <h1>Tecno Spark 20 Pro</h1>
      <section><h2>Seller Information</h2><p>Value Gadgets</p><div><bdo>72%</bdo> Seller Score</div><p>346 Followers</p></section>`;

    const product = parseProductPage(html, "https://www.jumia.com.ng/spark.html");

    expect(product.seller).toBe("Value Gadgets");
    expect(product.sellerScore).toBe(72);
  });

  it("reads category, brand and the current rating markup from search cards", () => {
    const html = `
      <article class="prd _fb col c-prd">
        <a href="/redmi-15c-123.html" class="core" data-gtm-brand="XIAOMI" data-gtm-category="Phones &amp; Tablets/Mobile Phones/Smartphones/Android Phones">
          <div class="info"><h3 class="name">XIAOMI Redmi 15C 6.9'' 4GB RAM/128GB ROM</h3><div class="prc">₦ 172,499</div>
          <div class="rev"><svg></svg><span class="rv-avg"> 4.3 </span><span class="rv-cnt">(1,646)</span></div></div>
        </a>
      </article>`;

    const [card] = parseSearchResults(html, "https://www.jumia.com.ng/smartphones/?q=redmi");

    expect(card.brand).toBe("XIAOMI");
    expect(card.categoryPath).toEqual(["Phones & Tablets", "Mobile Phones", "Smartphones", "Android Phones"]);
    expect(card.rating).toBe(4.3);
    expect(card.reviewCount).toBe(1646);
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
