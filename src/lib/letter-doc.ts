// Shared, pure helpers for the SCCMU Release Letter.
// The official Letter Head 26.docx is the master design — this module only
// fills its placeholders. It never rebuilds the letter.

export type LetterStudent = {
  full_name: string;
  class_name: string;
  member_user_id?: string | null;
};

export type LetterData = {
  ref_no: string;
  letter_date: string; // yyyy-mm-dd
  event_name: string;
  body: string;
  students: LetterStudent[];
};

export const DEFAULT_LETTER_BODY =
  "I kindly request your permission to release the following students of the Sivali Central College Media Unit from their regular academic activities in order to carry out the media coverage of the above event.";

export function formatLetterDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

export function studentLines(students: LetterStudent[]) {
  return students.map(
    (s, i) => `${String(i + 1).padStart(2, "0")}.  ${s.full_name.trim()}  -  ${(s.class_name || "").trim()}`,
  );
}

/** Lines that replace the {Body} + {Students Names and classes} placeholders. */
export function letterBodyLines(data: Pick<LetterData, "body" | "students">) {
  const body = (data.body || "").trim();
  const bodyLines = body ? body.split(/\r?\n/) : [];
  return { bodyLines, listLines: studentLines(data.students) };
}

export function validateLetter(input: {
  letter_date: string;
  event_name: string;
  students: LetterStudent[];
}): string[] {
  const errors: string[] = [];
  if (!input.letter_date) errors.push("Pick a date for the letter.");
  if (!input.event_name.trim()) errors.push("Enter the event name.");
  if (!input.students.length) errors.push("Add at least one student.");
  input.students.forEach((s, i) => {
    if (!s.full_name.trim()) errors.push(`Student ${i + 1} has no name.`);
    if (!s.class_name.trim()) errors.push(`Student ${i + 1} has no class.`);
  });
  const seen = new Set<string>();
  for (const s of input.students) {
    const key = (s.member_user_id ?? s.full_name.trim().toLowerCase()) as string;
    if (seen.has(key)) errors.push(`${s.full_name} is listed more than once.`);
    seen.add(key);
  }
  return errors;
}

/* ───────────────── DOCX placeholder filling ───────────────── */

function esc(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Multi-line text inside a single Word run: <w:t>a</w:t><w:br/><w:t>b</w:t> */
function runLines(lines: string[]) {
  if (!lines.length) return "";
  return lines.map(esc).join('</w:t><w:br/><w:t xml:space="preserve">');
}

/**
 * Replace the master template placeholders inside word/document.xml.
 * Only the generated copy is touched — the master file is never written to.
 */
export function fillDocumentXml(xml: string, data: LetterData) {
  const { bodyLines, listLines } = letterBodyLines(data);
  const bodyBlock = runLines(bodyLines.length ? bodyLines : [""]);
  // A blank line between the body paragraph and the student list.
  const listBlock = runLines(["", ...listLines]);

  return xml
    .replace(/\{Date\}/g, esc(formatLetterDate(data.letter_date)))
    .replace(/\{Event name\}/g, esc(data.event_name.trim()))
    .replace(/\{Body\}/g, bodyBlock)
    .replace(/\{Students Names and classes\}/g, listBlock);
}
