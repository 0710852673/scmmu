import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("production URLs", () => {
  it("welcome email points to sccmu.lovable.app", () => {
    const src = readFileSync("src/lib/onboarding.functions.ts", "utf8");
    expect(src).toContain("https://sccmu.lovable.app/auth");
    expect(src).not.toContain("scmmu");
  });
});
