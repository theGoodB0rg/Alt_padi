import { describe, expect, it } from "vitest";
import { tokenizeTitle } from "@core/parsers/tokenizer";

describe("tokenizeTitle", () => {
  it("removes shopping noise while preserving models, dimensions, and capacities", () => {
    expect(
      tokenizeTitle("Samsung Official Store 32-inch HD TV UA32T5300 2GB RAM - Black")
    ).toEqual(["samsung", "32inch", "hd", "tv", "ua32t5300", "2gb", "ram", "black"]);
  });
});
