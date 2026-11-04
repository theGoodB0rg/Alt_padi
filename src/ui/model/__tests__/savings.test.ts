import { describe, expect, it } from "vitest";
import { EMPTY_STATS, recordCheck, totalFound } from "@ui/model/savings";
import { makeCandidate, makeProduct, makeRun } from "@test/fixtures";

const phone = makeProduct({ url: "https://www.jumia.com.ng/phone.html" });
const saveRun = (price: number) => makeRun([makeCandidate({ product: { price } })], phone);

describe("savings tracker", () => {
  it("counts every check and adds the saving found", () => {
    const stats = recordCheck(EMPTY_STATS, saveRun(132000));
    expect(stats.checks).toBe(1);
    expect(totalFound(stats)).toBe(18000);
  });

  it("does not double count re-checks of the same product, and keeps the latest saving", () => {
    const stats = recordCheck(recordCheck(EMPTY_STATS, saveRun(132000)), saveRun(140000));
    expect(stats.checks).toBe(2);
    expect(totalFound(stats)).toBe(10000);
  });

  it("adds nothing when the user already had the lowest price", () => {
    const stats = recordCheck(EMPTY_STATS, makeRun([makeCandidate({ product: { price: 160000 } })], phone));
    expect(stats).toEqual({ checks: 1, found: {} });
  });
});
