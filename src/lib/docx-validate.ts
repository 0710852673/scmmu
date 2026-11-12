import { unzipSync } from "fflate";

export const MAX_DOCX_BYTES = 10 * 1024 * 1024;

/** Accept only real Word (.docx) files up to 10 MB. */
export function validateDocx(bytes: Uint8Array): { ok: true } | { ok: false; error: string } {
  if (bytes.length === 0) return { ok: false, error: "The file is empty." };
  if (bytes.length > MAX_DOCX_BYTES) return { ok: false, error: "The file is larger than 10 MB." };
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return { ok: false, error: "This is not a Word (.docx) file." };
  try {
    const files = unzipSync(bytes, { filter: (f) => f.name === "word/document.xml" || f.name === "[Content_Types].xml" });
    if (!files["word/document.xml"] || !files["[Content_Types].xml"]) return { ok: false, error: "This is not a Word (.docx) file." };
  } catch {
    return { ok: false, error: "The file is damaged or not a Word (.docx) file." };
  }
  return { ok: true };
}
