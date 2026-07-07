// Client-side PDF helpers. Small branded reports built with jsPDF + autoTable.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND = "#DC2626";
const FULL_NAME = "Sivali Central College Media Unit";

function header(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(BRAND);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, "F");
  doc.setTextColor("#FFFFFF");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("SCCMU", 14, 9);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(FULL_NAME, 14, 15);
  doc.text(new Date().toLocaleString(), doc.internal.pageSize.getWidth() - 14, 15, { align: "right" });

  doc.setTextColor("#111827");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 34);
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#6B7280");
    doc.text(subtitle, 14, 40);
    doc.setTextColor("#111827");
  }
}

function footer(doc: jsPDF) {
  const total = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor("#9CA3AF");
    doc.text(
      `${FULL_NAME} • Generated automatically`,
      14,
      doc.internal.pageSize.getHeight() - 8,
    );
    doc.text(
      `Page ${i} of ${total}`,
      doc.internal.pageSize.getWidth() - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: "right" },
    );
  }
}

function save(doc: jsPDF, filename: string) {
  footer(doc);
  doc.save(filename);
}

export function exportKeyValuePdf(
  filename: string,
  title: string,
  subtitle: string | undefined,
  rows: Array<[string, string | number | null | undefined]>,
) {
  const doc = new jsPDF();
  header(doc, title, subtitle);
  autoTable(doc, {
    startY: 48,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: BRAND, textColor: "#FFFFFF" },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55, textColor: "#6B7280" } },
    body: rows.map(([k, v]) => [k, v === null || v === undefined || v === "" ? "—" : String(v)]),
  });
  save(doc, filename);
}

export function exportTablePdf(
  filename: string,
  title: string,
  subtitle: string | undefined,
  columns: string[],
  rows: (string | number | null | undefined)[][],
) {
  const doc = new jsPDF();
  header(doc, title, subtitle);
  autoTable(doc, {
    startY: 48,
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BRAND, textColor: "#FFFFFF" },
    body: rows.map((r) => r.map((c) => (c === null || c === undefined ? "—" : String(c)))),
    columns: columns.map((c) => ({ header: c, dataKey: c })),
    head: [columns],
  });
  save(doc, filename);
}

export function exportSectionsPdf(
  filename: string,
  title: string,
  subtitle: string | undefined,
  sections: Array<{
    heading: string;
    kv?: Array<[string, string | number | null | undefined]>;
    table?: { columns: string[]; rows: (string | number | null | undefined)[][] };
  }>,
) {
  const doc = new jsPDF();
  header(doc, title, subtitle);
  let cursor = 48;
  for (const s of sections) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(BRAND);
    doc.text(s.heading, 14, cursor);
    cursor += 4;
    doc.setTextColor("#111827");
    if (s.kv) {
      autoTable(doc, {
        startY: cursor,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: "#F3F4F6", textColor: "#111827" },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 55, textColor: "#6B7280" } },
        body: s.kv.map(([k, v]) => [k, v === null || v === undefined || v === "" ? "—" : String(v)]),
      });
      cursor = (doc as any).lastAutoTable.finalY + 8;
    }
    if (s.table) {
      autoTable(doc, {
        startY: cursor,
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: BRAND, textColor: "#FFFFFF" },
        head: [s.table.columns],
        body: s.table.rows.map((r) => r.map((c) => (c === null || c === undefined ? "—" : String(c)))),
      });
      cursor = (doc as any).lastAutoTable.finalY + 8;
    }
  }
  save(doc, filename);
}
