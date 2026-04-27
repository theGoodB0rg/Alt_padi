import { describe, expect, it } from "vitest";
import { isMissingContentScriptError } from "@extension/contentScriptRecovery";

describe("isMissingContentScriptError", () => {
  it("detects Chrome receiving-end errors from tabs without the content script", () => {
    expect(
      isMissingContentScriptError(
        new Error("Could not establish connection. Receiving end does not exist.")
      )
    ).toBe(true);
  });

  it("does not classify unrelated extraction failures as missing content scripts", () => {
    expect(isMissingContentScriptError(new Error("Product extraction failed."))).toBe(false);
  });
});
