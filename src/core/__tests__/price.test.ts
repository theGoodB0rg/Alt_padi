import { describe, expect, it } from "vitest";
import { parseMoney } from "@core/parsers/price";

describe("parseMoney", () => {
  it("parses naira prices with symbols and separators", () => {
    expect(parseMoney("₦ 1,234,567")).toEqual({
      amount: 1234567,
      currency: "NGN",
      raw: "₦ 1,234,567"
    });
  });

  it("returns undefined for missing or malformed prices", () => {
    expect(parseMoney("")).toBeUndefined();
    expect(parseMoney("Contact seller")).toBeUndefined();
  });
});
