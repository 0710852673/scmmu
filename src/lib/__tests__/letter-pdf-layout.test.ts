import { describe, expect, it } from "vitest";
import { DEFAULT_LETTER_PDF_LAYOUT, normalizeLetterPdfLayout, normalizeLetterPdfLayoutPreset, normalizeLetterPdfLayoutPresets } from "../letter-pdf-layout";

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

  it("keeps content clear of the letterhead sidebar and header", () => {
    expect(normalizeLetterPdfLayout({ left: -10, top: 0 })).toMatchObject({ left: 60, top: 48 });
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


describe("release-letter PDF layout presets", () => {
  const preset = {
    format: "sccmu-release-letter-pdf-layout",
    version: 1,
    name: "AGM",
    layout: DEFAULT_LETTER_PDF_LAYOUT,
  } as const;

  it("rejects unsupported or malformed imported preset files", () => {
    expect(normalizeLetterPdfLayoutPreset({ ...preset, version: 2 })).toBeNull();
    expect(normalizeLetterPdfLayoutPreset({ ...preset, name: " " })).toBeNull();
    expect(normalizeLetterPdfLayoutPreset({ ...preset, layout: null })).toBeNull();
  });

  it("clamps imported measurements before they can affect the PDF", () => {
    const imported = normalizeLetterPdfLayoutPreset({
      ...preset,
      layout: { left: 999, right: 0, top: 999, bottom: 0, fontSize: 80 },
    });
    expect(imported).toMatchObject({
      name: "AGM",
      layout: { left: 85, right: 145, top: 90, bottom: 190, fontSize: 14 },
    });
  });

  it("deduplicates preset names and caps the browser list at ten", () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      ...preset,
      name: `Preset ${index}`,
    }));
    expect(normalizeLetterPdfLayoutPresets([...many, { ...preset, name: "PRESET 0" }])).toHaveLength(10);
    expect(normalizeLetterPdfLayoutPresets([{ ...preset }, { ...preset, name: "agm" }])).toHaveLength(1);
    expect(normalizeLetterPdfLayoutPresets("not an array")).toEqual([]);
  });
});
