export type CsvCell = string | number | boolean | null | undefined;

export function escapeCsvCell(value: CsvCell): string {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function rowsToCsv(headers: string[], rows: CsvCell[][]): string {
  if (headers.length === 0) return "";
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

export function safeCsvFilename(filename: string, fallback = "export.csv"): string {
  const trimmed = filename.trim().replace(/[\\/\0]/g, "-");
  const withExtension = trimmed.toLowerCase().endsWith(".csv") ? trimmed : `${trimmed}.csv`;
  return withExtension === ".csv" ? fallback : withExtension;
}

export function downloadCsv(filename: string, csv: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob(["\\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeCsvFilename(filename);
  anchor.click();
  URL.revokeObjectURL(url);
}
