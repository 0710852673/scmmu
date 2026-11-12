import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { validateDocx, MAX_DOCX_BYTES } from "../docx-validate";

describe("letter template upload validation", () => {
  it("accepts a minimal docx", () => {
    const z = zipSync({ "[Content_Types].xml": strToU8("<x/>"), "word/document.xml": strToU8("<w/>") });
    expect(validateDocx(z).ok).toBe(true);
  });
  it("rejects non-zip files", () => {
    expect(validateDocx(strToU8("<script>")).ok).toBe(false);
  });
  it("rejects zips that are not Word documents", () => {
    expect(validateDocx(zipSync({ "a.txt": strToU8("x") })).ok).toBe(false);
  });
  it("rejects files over 10 MB", () => {
    const big = new Uint8Array(MAX_DOCX_BYTES + 1); big[0] = 0x50; big[1] = 0x4b;
    expect(validateDocx(big).ok).toBe(false);
  });
});
