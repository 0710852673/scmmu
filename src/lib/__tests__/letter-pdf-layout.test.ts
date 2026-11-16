import { describe, expect, it } from "vitest";
import { DEFAULT_LETTER_PDF_LAYOUT, normalizeLetterPdfLayout } from "../letter-pdf-layout";

describe("release-letter PDF layout", () => {
  it("preserves the official letterhead current default measurements", () => {
    expect(normalizeLetterPdfLayout()).toEqual(DEFAULT_LETTER_PDF_LAYOUT);
  });

  it("clamps layout settings to safe A4 coordinates and readable ranges", () => {
    expect(normalizeLetterPdfLayout({
      left: 200, right: 0, top: 100, bottom: 10, fontSize: 30,
      lineSpacing: 1, paragraphSpacing: -3, signatureSpacing: 99,
    })).toEqual({
      left: 85, right: 145, top: 90, bottom: 190, fontSize: 14,
      lineSpacing: 4.2, paragraphSpacing: 0, signatureSpacing: 20,
    });
  });

  it("falls back to defaults for non-finite values", () => {
    expect(normalizeLetterPdfLayout({
      left: Number.NaN, right: Number.POSITIVE_INFINITY, top: Number.NaN,
      bottom: Number.NEGATIVE_INFINITY, fontSize: Number.NaN,
      lineSpacing: Number.POSITIVE_INFINITY, paragraphSpacing: Number.NaN,
      signatureSpacing: Number.NEGATIVE_INFINITY,
    })).toEqual(DEFAULT_LETTER_PDF_LAYOUT);
  });
});
