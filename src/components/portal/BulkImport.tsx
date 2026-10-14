import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, Download, Play, Mail, Trash2 } from "lucide-react";
import { Card, SectionTitle } from "./PortalUI";
import { onboardCreateMember, onboardSendWelcome } from "@/lib/onboarding.functions";

type Row = {
  full_name: string; email: string; role: string; grade?: string; class?: string; whatsapp?: string; primary_division?: string;
  status: "pending" | "created" | "skipped" | "failed"; message?: string; number?: string | null; user_id?: string; mail?: "sent" | "failed";
};
const KEY = "sccmu_onboarding_import";
const COLS: Record<string, keyof Row> = {
  "full name": "full_name", name: "full_name", full_name: "full_name", email: "email", gmail: "email", role: "role",
  grade: "grade", class: "class", whatsapp: "whatsapp", section: "primary_division", division: "primary_division", primary_division: "primary_division",
};

function parseCsv(text: string): string[][] {
  const out: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); out.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); out.push(row); }
  return out.filter((r) => r.some((v) => v.trim()));
}

function toRows(grid: string[][]): Row[] {
  const head = grid[0].map((h) => COLS[String(h).trim().toLowerCase()]);
  if (!head.includes("full_name") || !head.includes("email")) throw new Error("The file needs 'Full name' and 'Email' columns.");
  return grid.slice(1).map((r) => {
    const o: any = { status: "pending", role: "member" };
    head.forEach((k, i) => { if (k && r[i] != null && String(r[i]).trim()) o[k] = String(r[i]).trim(); });
    return o as Row;
  }).filter((r) => r.full_name || r.email);
}

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function BulkImport({ onDone }: { onDone: () => void }) {
  const create = useServerFn(onboardCreateMember);
  const send = useServerFn(onboardSendWelcome);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [confirmMail, setConfirmMail] = useState(false);

  useEffect(() => { try { const s = localStorage.getItem(KEY); if (s) setRows(JSON.parse(s)); } catch { /* ignore */ } }, []);
  const save = (r: Row[]) => { setRows(r); localStorage.setItem(KEY, JSON.stringify(r)); };

  async function onFile(f: File) {
    try {
      let grid: string[][];
      if (/\.xlsx$/i.test(f.name)) {
        const { default: readXlsx } = await import("read-excel-file/browser");
        grid = (await readXlsx(f)).map((r: any[]) => r.map((v) => (v == null ? "" : String(v))));
      } else grid = parseCsv(await f.text());
      const parsed = toRows(grid);
      if (!parsed.length) throw new Error("No member rows found.");
      save(parsed);
      toast.success(`${parsed.length} rows ready. Press Start import.`);
    } catch (e: any) { toast.error(e?.message ?? "Could not read the file."); }
  }

  async function run() {
    setRunning(true);
    const r = [...rows];
    for (let i = 0; i < r.length; i++) {
      if (r[i].status !== "pending") continue;
      try {
        const res = await create({ data: r[i] });
        r[i] = { ...r[i], status: "created", number: res.mu, user_id: res.user_id, message: "Account created" };
      } catch (e: any) {
        const m = String(e?.message ?? "Failed");
        r[i] = { ...r[i], status: /already exists/i.test(m) ? "skipped" : "failed", message: m };
      }
      save([...r]); // saved after every row so an interrupted import can resume
    }
    setRunning(false); onDone();
    toast.success("Import finished.");
  }

  async function sendAll() {
    setConfirmMail(false); setRunning(true);
    const r = [...rows];
    for (let i = 0; i < r.length; i++) {
      if (r[i].status !== "created" || !r[i].user_id || r[i].mail === "sent") continue;
      try { await send({ data: { user_id: r[i].user_id!, confirm_email: r[i].email } }); r[i] = { ...r[i], mail: "sent" }; }
      catch (e: any) { r[i] = { ...r[i], mail: "failed", message: String(e?.message ?? "Email failed") }; }
      save([...r]);
    }
    setRunning(false); onDone();
  }

  function exportCsv() {
    const head = ["Full name", "Email", "Role", "Number", "Result", "Welcome email", "Message"];
    const body = rows.map((r) => [r.full_name, r.email, r.role, r.number ?? "", r.status, r.mail ?? "", r.message ?? ""].map(csvCell).join(","));
    const blob = new Blob(["\uFEFF" + [head.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "sccmu-onboarding-results.csv"; a.click();
  }

  function template() {
    const blob = new Blob(["Full name,Email,Role,Grade,Class,WhatsApp,Section\nKasun Perera,kasun@gmail.com,Member,12,12-A,0771234567,photography\n"], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "sccmu-members-template.csv"; a.click();
  }

  const count = (s: Row["status"]) => rows.filter((r) => r.status === s).length;
  const pending = count("pending");
  const toMail = rows.filter((r) => r.status === "created" && r.mail !== "sent").length;

  return (
    <Card className="mt-6">
      <SectionTitle sub="Excel (.xlsx) or CSV. Columns: Full name, Email, Role (Member / TIC / Head / Board / Admin), Grade, Class, WhatsApp, Section.">Import from Excel / CSV</SectionTitle>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
          <Upload className="h-4 w-4" /> Choose file
          <input type="file" accept=".csv,.xlsx" className="hidden" disabled={running} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        </label>
        <button onClick={template} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm">Download template</button>
        {pending > 0 && <button disabled={running} onClick={run} className="inline-flex items-center gap-2 rounded-full brand-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          <Play className="h-4 w-4" /> {running ? "Working…" : rows.length > pending ? `Resume import (${pending} left)` : `Start import (${pending})`}</button>}
        {toMail > 0 && !running && <button onClick={() => setConfirmMail(true)} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold"><Mail className="h-4 w-4" /> Send welcome emails ({toMail})</button>}
        {rows.length > 0 && <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm"><Download className="h-4 w-4" /> Export results</button>}
        {rows.length > 0 && !running && <button onClick={() => { if (confirm("Clear this import list? Created accounts stay.")) save([]); }} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground"><Trash2 className="h-4 w-4" /> Clear</button>}
      </div>

      {rows.length > 0 && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 text-center text-xs">
            {[["Total", rows.length], ["Created", count("created")], ["Skipped", count("skipped")], ["Failed", count("failed")], ["Waiting", pending]].map(([l, n]) => (
              <div key={l as string} className="rounded-lg border border-border p-2"><div className="text-lg font-bold">{n}</div>{l}</div>
            ))}
          </div>
          <div className="mt-4 max-h-96 overflow-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="py-2">Member</th><th>Role</th><th>Number</th><th>Result</th><th>Email</th></tr></thead>
              <tbody>{rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-2"><div className="font-semibold">{r.full_name}</div><div className="text-xs text-muted-foreground break-all">{r.email}</div></td>
                  <td className="text-xs capitalize">{r.role}</td>
                  <td className="font-mono text-xs">{r.number ?? "—"}</td>
                  <td className={`text-xs ${r.status === "failed" ? "text-destructive" : ""}`}>{r.status}{r.message && r.status !== "created" && <div>{r.message}</div>}</td>
                  <td className="text-xs">{r.mail ?? "—"}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {confirmMail && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
            <h2 className="font-display text-xl font-bold">Send {toMail} welcome emails?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Each new member gets their own new temporary password by email from the SCCMU Gmail.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmMail(false)} className="rounded-full border border-border px-4 py-2 text-sm">Cancel</button>
              <button onClick={sendAll} className="rounded-full brand-gradient px-4 py-2 text-sm font-semibold text-white">Send emails</button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
