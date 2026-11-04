import { describe, expect, it } from "vitest";
import { formatMoney } from "@ui/model/format";

describe("formatMoney", () => {
  it("formats whole naira with grouping", () => {
    expect(formatMoney(17500)).toBe("₦17,500");
    expect(formatMoney(1234.6)).toBe("₦1,235");
  });
});
