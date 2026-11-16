// Renders the official SCCMU release letter as a PDF.
// The page background is the *exact* official letterhead artwork extracted from
// the master Letter Head 26.docx — nothing about the design is recreated by hand.
// Only the four fill-in fields are typed on top, in the same positions Word uses.
import jsPDF from "jspdf";
import letterhead from "@/assets/letterhead-2026.png.asset.json";
import { formatLetterDate, studentLines, type LetterStudent } from "@/lib/letter-doc";
import { normalizeLetterPdfLayout, type LetterPdfLayout } from "@/lib/letter-pdf-layout";

const PAGE_W = 210;
const PAGE_H = 297;

let cached: string | null = null;
async function letterheadDataUrl() {
  if (cached) return cached;
  const res = await fetch(letterhead.url);
  const blob = await res.blob();
  cached = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
  return cached;
}

export type LetterPdfInput = {
  letter_date: string;
  event_name: string;
  body: string;
  students: LetterStudent[];
};

export async function renderReleaseLetterPdf(data: LetterPdfInput, layoutOptions?: Partial<LetterPdfLayout>) {
  const layout = normalizeLetterPdfLayout(layoutOptions);
  const X = layout.left;
  const RIGHT = layout.right;
  const WIDTH = RIGHT - X;
  const TOP = layout.top;
  const BOTTOM = layout.bottom;
  const bg = await letterheadDataUrl();
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

  const newPage = (first = false) => {
    if (!first) doc.addPage();
    doc.addImage(bg, "PNG", 0, 0, PAGE_W, PAGE_H, undefined, "FAST");
    doc.setTextColor(17, 19, 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(layout.fontSize);
  };

  newPage(true);
  let y = TOP;

  const space = (mm: number) => {
    y += mm;
    if (y > BOTTOM) { newPage(); y = TOP; }
  };

  const line = (text: string, opts: { bold?: boolean; underline?: boolean; size?: number } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? layout.fontSize);
    if (y > BOTTOM) { newPage(); y = TOP; }
    doc.text(text, X, y);
    if (opts.underline && text.trim()) {
      const w = doc.getTextWidth(text);
      doc.setLineWidth(0.3);
      doc.line(X, y + 1.1, X + w, y + 1.1);
    }
    y += layout.lineSpacing;
  };

  const paragraph = (text: string, opts: { bold?: boolean } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(layout.fontSize);
    for (const l of doc.splitTextToSize(text, WIDTH) as string[]) line(l, opts);
  };

  // Date (right aligned within the content column, as in the template)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(layout.fontSize);
  doc.text(formatLetterDate(data.letter_date), RIGHT, y, { align: "right" });
  y += 10;

  line("Principal,");
  line("Sivali Central College,");
  line("Ratnapura");
  space(6);

  paragraph(`Release students for ${data.event_name.trim()} media coverage`, { bold: true });
  // underline the subject line
  space(4);

  line("Dear Sir,");
  space(layout.paragraphSpacing);

  const body = (data.body || "").trim();
  if (body) {
    for (const para of body.split(/\n{2,}/)) {
      paragraph(para.replace(/\n/g, " "));
      space(layout.paragraphSpacing);
    }
  }

  space(1);
  for (const l of studentLines(data.students)) line(l);

  space(6);
  line("Thank you.");
  space(4);
  line("Yours faithfully,");
  space(layout.signatureSpacing);

  if (y > BOTTOM - 16) { newPage(); y = TOP + 20; }
  doc.setFontSize(layout.fontSize);
  doc.text("……………………………..", X, y);
  doc.text("……………………………..", RIGHT, y, { align: "right" });
  y += layout.lineSpacing;
  doc.text("Teacher-in-Charge", X, y);
  doc.text("Principal", RIGHT, y, { align: "right" });

  return doc;
}

export async function downloadReleaseLetterPdf(data: LetterPdfInput, filename: string, layout?: Partial<LetterPdfLayout>) {
  const doc = await renderReleaseLetterPdf(data, layout);
  doc.save(filename);
}

export async function releaseLetterPdfObjectUrl(data: LetterPdfInput, layout?: Partial<LetterPdfLayout>) {
  const doc = await renderReleaseLetterPdf(data, layout);
  return URL.createObjectURL(doc.output("blob"));
}
