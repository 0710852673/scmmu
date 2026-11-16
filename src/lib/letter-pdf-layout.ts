export type LetterPdfLayout = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  fontSize: number;
  lineSpacing: number;
  paragraphSpacing: number;
  signatureSpacing: number;
};

export const DEFAULT_LETTER_PDF_LAYOUT: LetterPdfLayout = {
  left: 63,
  right: 198,
  top: 56,
  bottom: 262,
  fontSize: 11,
  lineSpacing: 5.6,
  paragraphSpacing: 3,
  signatureSpacing: 12,
};

export const LETTER_PDF_LAYOUT_STORAGE_KEY = "sccmu.release-letter.pdf-layout.v1";

function clamp(value: unknown, fallback: number, min: number, max: number): number {
  const candidate = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Number(Math.min(max, Math.max(min, candidate)).toFixed(1));
}

/** Keep browser-saved layout settings inside safe A4 coordinates and readable ranges. */
export function normalizeLetterPdfLayout(input?: Partial<LetterPdfLayout> | null): LetterPdfLayout {
  const left = clamp(input?.left, DEFAULT_LETTER_PDF_LAYOUT.left, 55, 85);
  const right = clamp(input?.right, DEFAULT_LETTER_PDF_LAYOUT.right, left + 60, 202);
  const top = clamp(input?.top, DEFAULT_LETTER_PDF_LAYOUT.top, 42, 90);
  const bottom = clamp(input?.bottom, DEFAULT_LETTER_PDF_LAYOUT.bottom, top + 100, 280);

  return {
    left,
    right,
    top,
    bottom,
    fontSize: clamp(input?.fontSize, DEFAULT_LETTER_PDF_LAYOUT.fontSize, 9, 14),
    lineSpacing: clamp(input?.lineSpacing, DEFAULT_LETTER_PDF_LAYOUT.lineSpacing, 4.2, 8),
    paragraphSpacing: clamp(input?.paragraphSpacing, DEFAULT_LETTER_PDF_LAYOUT.paragraphSpacing, 0, 8),
    signatureSpacing: clamp(input?.signatureSpacing, DEFAULT_LETTER_PDF_LAYOUT.signatureSpacing, 8, 20),
  };
}
