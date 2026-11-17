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
  const left = clamp(input?.left, DEFAULT_LETTER_PDF_LAYOUT.left, 60, 85);
  const right = clamp(input?.right, DEFAULT_LETTER_PDF_LAYOUT.right, left + 60, 202);
  const top = clamp(input?.top, DEFAULT_LETTER_PDF_LAYOUT.top, 48, 90);
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


export const LETTER_PDF_LAYOUT_PRESETS_STORAGE_KEY = "sccmu.release-letter.pdf-layout-presets.v1";
export type LetterPdfLayoutPreset = {
  format: "sccmu-release-letter-pdf-layout";
  version: 1;
  name: string;
  layout: LetterPdfLayout;
};

const MAX_LETTER_PDF_LAYOUT_PRESETS = 10;

export function normalizeLetterPdfLayoutPreset(input: unknown): LetterPdfLayoutPreset | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const candidate = input as {
    format?: unknown;
    version?: unknown;
    name?: unknown;
    layout?: unknown;
  };
  if (
    candidate.format !== "sccmu-release-letter-pdf-layout" ||
    candidate.version !== 1 ||
    typeof candidate.name !== "string" ||
    !candidate.name.trim() ||
    !candidate.layout ||
    typeof candidate.layout !== "object" ||
    Array.isArray(candidate.layout)
  ) {
    return null;
  }
  return {
    format: "sccmu-release-letter-pdf-layout",
    version: 1,
    name: candidate.name.trim().slice(0, 40),
    layout: normalizeLetterPdfLayout(candidate.layout as Partial<LetterPdfLayout>),
  };
}

export function normalizeLetterPdfLayoutPresets(input: unknown): LetterPdfLayoutPreset[] {
  if (!Array.isArray(input)) return [];
  const names = new Set<string>();
  const presets: LetterPdfLayoutPreset[] = [];
  for (const item of input) {
    const preset = normalizeLetterPdfLayoutPreset(item);
    if (!preset) continue;
    const key = preset.name.toLocaleLowerCase();
    if (names.has(key)) continue;
    names.add(key);
    presets.push(preset);
    if (presets.length >= MAX_LETTER_PDF_LAYOUT_PRESETS) break;
  }
  return presets;
}
