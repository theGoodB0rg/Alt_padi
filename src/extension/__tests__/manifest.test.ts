import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = path.resolve("public");
const manifest = JSON.parse(readFileSync(path.join(publicDir, "manifest.json"), "utf8"));
const SIZES = ["16", "32", "48", "128"];

describe("manifest icons", () => {
  it("gives Chrome a branded icon at every size it asks for", () => {
    expect(Object.keys(manifest.icons)).toEqual(SIZES);
    expect(manifest.action.default_icon).toEqual(manifest.icons);
  });

  it("points at icon files that exist", () => {
    for (const file of Object.values<string>(manifest.icons)) {
      expect(existsSync(path.join(publicDir, file)), file).toBe(true);
    }
  });
});
