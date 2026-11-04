import { describe, expect, it } from "vitest";
import { describeError, progressSteps } from "@ui/model/status";

describe("progressSteps", () => {
  it("starts on the first step", () => {
    expect(progressSteps(undefined).map((s) => s.status)).toEqual(["active", "waiting", "waiting"]);
  });

  it("counts searches while searching", () => {
    const steps = progressSteps({ stage: "searching", done: 1, total: 3 });
    expect(steps.map((s) => s.status)).toEqual(["done", "active", "waiting"]);
    expect(steps[1]).toMatchObject({ label: "Searching Jumia", detail: "1 of 3" });
  });

  it("shows how many listings are being compared", () => {
    const steps = progressSteps({ stage: "comparing", found: 48 });
    expect(steps.map((s) => s.status)).toEqual(["done", "done", "active"]);
    expect(steps[2]).toMatchObject({ label: "Comparing listings", detail: "48 found" });
  });
});

describe("describeError", () => {
  it("guides the user to a product page", () => {
    expect(describeError("Open a Jumia Nigeria product page before searching.")).toMatchObject({
      kind: "not-product",
      title: "Open a Jumia product"
    });
  });

  it("recognises connection problems", () => {
    expect(describeError("Failed to fetch")).toMatchObject({ kind: "offline", title: "Couldn't reach Jumia" });
    expect(describeError("HTTP 503")).toMatchObject({ kind: "offline" });
  });

  it("keeps the original message for anything else", () => {
    expect(describeError("Parser exploded")).toEqual({
      kind: "failed",
      title: "Something went wrong",
      body: "Parser exploded"
    });
  });
});
