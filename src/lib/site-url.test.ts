import { describe, expect, it } from "vitest";
import { normalizeOrigin } from "./site-url";

describe("address settings", () => {
  it("accepts the address with or without https:// and a trailing slash", () => {
    for (const v of ["1880.io", "https://1880.io", "https://1880.io/", " 1880.io/ "])
      expect(normalizeOrigin(v)).toBe("https://1880.io");
    expect(normalizeOrigin("http://localhost:3100")).toBe("http://localhost:3100");
    expect(normalizeOrigin("")).toBeUndefined();
    expect(normalizeOrigin(undefined)).toBeUndefined();
  });
});
