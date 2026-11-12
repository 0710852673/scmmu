import { describe, it, expect } from "vitest";
import { isFresh } from "../caller.server";

describe("public notification window", () => {
  it("allows a record created just now", () => {
    expect(isFresh(new Date().toISOString())).toBe(true);
  });
  it("rejects a record older than 10 minutes", () => {
    expect(isFresh(new Date(Date.now() - 11 * 60_000).toISOString())).toBe(false);
  });
  it("rejects missing dates", () => {
    expect(isFresh(null)).toBe(false);
  });
});
