// Client-side PDF engine for SCC Media Unit reports.
// One shared visual template: ink cover band, red/amber brand rule, quiet tables.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ─────────────────────────── theme ─────────────────────────── */

export const PDF_THEME = {
  ink: "#111318",
  inkSoft: "#3A3F4B",
  muted: "#8A8F9C",
  hairline: "#E3E5EA",
  paper: "#FFFFFF",
  zebra: "#F6F7F9",
  brand: "#DC2626",
  amber: "#F5B91E",
  white: "#FFFFFF",
};

const UNIT = "Sivali Central College Media Unit";
const UNIT_SHORT = "SCC MEDIA UNIT";
const CONTACT = "mediaunit.scc@gmail.com  ·  +94 70 5951050  ·  Media Unit, Sivali Central College, Ratnapura";

export type Cell = string | number | null | undefined;
const val = (c: Cell) => (c === null || c === undefined || c === "" ? "—" : String(c));

/* ─────────────────────── image helpers ─────────────────────── */

export type LoadedImage = { dataUrl: string; format: "JPEG" | "PNG" };

/** Fetch a remote image and turn it into a data URL usable by jsPDF. Never throws. */
export async function loadImage(url?: string | null): Promise<LoadedImage | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    return { dataUrl, format: blob.type.includes("png") ? "PNG" : "JPEG" };
  } catch {
    return null;
  }
}

export async function loadImages(urls: Array<string | null | undefined>) {
  const unique = Array.from(new Set(urls.filter(Boolean) as string[]));
  const loaded = await Promise.all(unique.map((u) => loadImage(u)));
  const map = new Map<string, LoadedImage>();
  unique.forEach((u, i) => { const im = loaded[i]; if (im) map.set(u, im); });
  return map;
}

/* ─────────────────────── page furniture ────────────────────── */

type DocOpts = {
  landscape?: boolean;
  confidential?: boolean;
};

function newDoc(opts: DocOpts = {}) {
  return new jsPDF({ orientation: opts.landscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
}

/** Ink masthead + brand rule. Returns the Y cursor below the header. */
function masthead(doc: jsPDF, title: string, subtitle?: string, kicker?: string) {
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(PDF_THEME.ink);
  doc.rect(0, 0, W, 26, "F");
  doc.setFillColor(PDF_THEME.brand);
  doc.rect(0, 26, W * 0.62, 1.6, "F");
  doc.setFillColor(PDF_THEME.amber);
  doc.rect(W * 0.62, 26, W * 0.38, 1.6, "F");

  doc.setTextColor(PDF_THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(UNIT_SHORT, 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor("#B9BDC7");
  doc.text(UNIT, 14, 17.5);
  doc.text(
    new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
    W - 14, 17.5, { align: "right" },
  );
  if (kicker) {
    doc.setTextColor(PDF_THEME.amber);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(kicker.toUpperCase(), W - 14, 11.5, { align: "right" });
  }

  doc.setTextColor(PDF_THEME.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text(title, 14, 42);

  let y = 48;
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(PDF_THEME.muted);
    const lines = doc.splitTextToSize(subtitle, doc.internal.pageSize.getWidth() - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4.6 + 2;
  }
  doc.setDrawColor(PDF_THEME.hairline);
  doc.setLineWidth(0.3);
  doc.line(14, y, doc.internal.pageSize.getWidth() - 14, y);
  return y + 8;
}

function finish(doc: jsPDF, filename: string, opts: DocOpts = {}) {
  const total = (doc as any).internal.getNumberOfPages();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(PDF_THEME.hairline);
    doc.setLineWidth(0.3);
    doc.line(14, H - 12, W - 14, H - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(PDF_THEME.muted);
    doc.text(opts.confidential ? `${CONTACT}  ·  CONFIDENTIAL — internal use` : CONTACT, 14, H - 7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(PDF_THEME.inkSoft);
    doc.text(`${i} / ${total}`, W - 14, H - 7.5, { align: "right" });
  }
  doc.save(filename);
}

const tableBase = {
  theme: "plain" as const,
  styles: { fontSize: 8.6, cellPadding: 2.8, textColor: PDF_THEME.inkSoft, lineColor: PDF_THEME.hairline, lineWidth: 0.1 },
  headStyles: {
    fillColor: PDF_THEME.ink, textColor: PDF_THEME.white, fontSize: 7.4,
    fontStyle: "bold" as const, cellPadding: 2.6, halign: "left" as const,
  },
  alternateRowStyles: { fillColor: PDF_THEME.zebra },
  margin: { left: 14, right: 14, bottom: 18 },
};

function sectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setFillColor(PDF_THEME.brand);
  doc.rect(14, y - 3.4, 2, 4.6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(PDF_THEME.ink);
  doc.text(text.toUpperCase(), 18.5, y);
  return y + 4;
}

function ensureSpace(doc: jsPDF, y: number, needed = 30) {
  if (y + needed > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    return 22;
  }
  return y;
}

/* ─────────────────────── public builders ───────────────────── */

export function exportKeyValuePdf(
  filename: string, title: string, subtitle: string | undefined,
  rows: Array<[string, Cell]>,
) {
  const doc = newDoc();
  const y = masthead(doc, title, subtitle);
  autoTable(doc, {
    ...tableBase, startY: y,
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55, textColor: PDF_THEME.ink } },
    body: rows.map(([k, v]) => [k, val(v)]),
  });
  finish(doc, filename);
}

export function exportTablePdf(
  filename: string, title: string, subtitle: string | undefined,
  columns: string[], rows: Cell[][], opts: DocOpts = {},
) {
  const doc = newDoc(opts);
  const y = masthead(doc, title, subtitle);
  autoTable(doc, { ...tableBase, startY: y, head: [columns], body: rows.map((r) => r.map(val)) });
  finish(doc, filename, opts);
}

export type PdfSection = {
  heading: string;
  kv?: Array<[string, Cell]>;
  text?: string;
  table?: { columns: string[]; rows: Cell[][] };
};

/** Multi-section report. Optionally stamps a portrait photo + stat chips at the top. */
export async function exportSectionsPdf(
  filename: string,
  title: string,
  subtitle: string | undefined,
  sections: PdfSection[],
  opts: DocOpts & {
    photoUrl?: string | null;
    kicker?: string;
    chips?: Array<{ label: string; value: Cell }>;
  } = {},
) {
  const doc = newDoc(opts);
  const W = doc.internal.pageSize.getWidth();
  const photo = opts.photoUrl ? await loadImage(opts.photoUrl) : null;

  let y = masthead(doc, title, subtitle, opts.kicker);

  if (photo) {
    // Portrait card, right aligned against the masthead block.
    const size = 30;
    const x = W - 14 - size;
    doc.setFillColor(PDF_THEME.zebra);
    doc.roundedRect(x - 1.5, 34 - 1.5, size + 3, size + 3, 2, 2, "F");
    try { doc.addImage(photo.dataUrl, photo.format, x, 34, size, size, undefined, "FAST"); } catch { /* ignore */ }
    doc.setDrawColor(PDF_THEME.brand);
    doc.setLineWidth(0.6);
    doc.line(x - 1.5, 34 + size + 2.2, x + size + 1.5, 34 + size + 2.2);
    y = Math.max(y, 34 + size + 10);
  }

  if (opts.chips?.length) {
    const w = (W - 28 - (opts.chips.length - 1) * 4) / opts.chips.length;
    opts.chips.forEach((c, i) => {
      const x = 14 + i * (w + 4);
      doc.setFillColor(PDF_THEME.zebra);
      doc.roundedRect(x, y, w, 16, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.6);
      doc.setTextColor(PDF_THEME.muted);
      doc.text(c.label.toUpperCase(), x + 4, y + 6);
      doc.setFontSize(12);
      doc.setTextColor(PDF_THEME.ink);
      doc.text(val(c.value), x + 4, y + 13);
    });
    y += 24;
  }

  for (const s of sections) {
    y = ensureSpace(doc, y, 26);
    y = sectionTitle(doc, s.heading, y);

    if (s.text) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(PDF_THEME.inkSoft);
      const lines = doc.splitTextToSize(s.text, W - 28);
      doc.text(lines, 14, y + 3);
      y += lines.length * 4.4 + 8;
    }
    if (s.kv?.length) {
      autoTable(doc, {
        ...tableBase, startY: y,
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 52, textColor: PDF_THEME.ink } },
        body: s.kv.map(([k, v]) => [k, val(v)]),
      });
      y = (doc as any).lastAutoTable.finalY + 9;
    }
    if (s.table) {
      autoTable(doc, {
        ...tableBase, startY: y,
        head: [s.table.columns],
        body: s.table.rows.length ? s.table.rows.map((r) => r.map(val)) : [[{ content: "No records.", colSpan: s.table.columns.length, styles: { textColor: PDF_THEME.muted, halign: "center" as const } } as any]],
      });
      y = (doc as any).lastAutoTable.finalY + 9;
    }
  }

  finish(doc, filename, opts);
}

/* ───────────────── directory / roster report ───────────────── */

export type RosterRow = {
  photo_url?: string | null;
  cells: Cell[];
};

export type RosterGroup = { heading: string; rows: RosterRow[] };

/**
 * Member directory: optional thumbnails, grouped sections, summary chips.
 */
export async function exportRosterPdf(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  kicker?: string;
  columns: string[];
  groups: RosterGroup[];
  withPhotos?: boolean;
  chips?: Array<{ label: string; value: Cell }>;
  notes?: string;
  landscape?: boolean;
  confidential?: boolean;
}) {
  const doc = newDoc({ landscape: opts.landscape, confidential: opts.confidential });
  const W = doc.internal.pageSize.getWidth();

  const images = opts.withPhotos
    ? await loadImages(opts.groups.flatMap((g) => g.rows.map((r) => r.photo_url)))
    : new Map<string, LoadedImage>();

  let y = masthead(doc, opts.title, opts.subtitle, opts.kicker);

  if (opts.chips?.length) {
    const w = (W - 28 - (opts.chips.length - 1) * 4) / opts.chips.length;
    opts.chips.forEach((c, i) => {
      const x = 14 + i * (w + 4);
      doc.setFillColor(PDF_THEME.zebra);
      doc.roundedRect(x, y, w, 16, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.4);
      doc.setTextColor(PDF_THEME.muted);
      doc.text(String(c.label).toUpperCase(), x + 3.5, y + 6);
      doc.setFontSize(12);
      doc.setTextColor(PDF_THEME.ink);
      doc.text(val(c.value), x + 3.5, y + 13);
    });
    y += 24;
  }

  if (opts.notes) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.6);
    doc.setTextColor(PDF_THEME.muted);
    const lines = doc.splitTextToSize(opts.notes, W - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4.2 + 6;
  }

  const head = opts.withPhotos ? ["", ...opts.columns] : opts.columns;

  for (const g of opts.groups) {
    if (!g.rows.length) continue;
    y = ensureSpace(doc, y, 30);
    y = sectionTitle(doc, `${g.heading}  (${g.rows.length})`, y);

    const body = g.rows.map((r) => (opts.withPhotos ? ["", ...r.cells.map(val)] : r.cells.map(val)));

    autoTable(doc, {
      ...tableBase,
      startY: y + 1,
      head: [head],
      body,
      styles: { ...tableBase.styles, minCellHeight: opts.withPhotos ? 12 : undefined, valign: "middle" as const },
      columnStyles: opts.withPhotos ? { 0: { cellWidth: 14 } } : undefined,
      didDrawCell: (data: any) => {
        if (!opts.withPhotos || data.section !== "body" || data.column.index !== 0) return;
        const row = g.rows[data.row.index];
        const im = row?.photo_url ? images.get(row.photo_url) : null;
        const s = 10;
        const x = data.cell.x + (data.cell.width - s) / 2;
        const yy = data.cell.y + (data.cell.height - s) / 2;
        if (im) {
          try { doc.addImage(im.dataUrl, im.format, x, yy, s, s, undefined, "FAST"); return; } catch { /* fall through */ }
        }
        doc.setFillColor(PDF_THEME.hairline);
        doc.roundedRect(x, yy, s, s, 1.5, 1.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(PDF_THEME.muted);
        const initial = String(row?.cells?.find((c) => typeof c === "string" && c) ?? "?")[0]?.toUpperCase() ?? "?";
        doc.text(initial, x + s / 2, yy + s / 2 + 1.8, { align: "center" });
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  finish(doc, opts.filename, { confidential: opts.confidential });
}
