import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fillDocumentXml, type LetterStudent } from "@/lib/letter-doc";

const STAFF_ROLES = ["administrator", "tic", "section_head", "executive_board"];

async function assertStaff(context: any) {
  const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (!roles.some((r: string) => STAFF_ROLES.includes(r))) throw new Error("Not authorised");
  return roles as string[];
}

export type LetterRecord = {
  id: string;
  ref_no: string;
  letter_date: string;
  event_name: string;
  body: string;
  status: string;
  docx_path: string | null;
  generated_at: string | null;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
  template_id: string | null;
  students: (LetterStudent & { id: string; position: number })[];
};

/* ───────────────── member directory ───────────────── */

export type LetterMemberOption = {
  id: string;
  full_name: string;
  class_name: string;
  grade: string | null;
  admission_number: string | null;
};

/** Members available for selection in the letter builder. */
export const listLetterMemberOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name,grade,class,admission_number")
      .order("full_name");
    return (data ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      class_name: [p.grade, p.class].filter(Boolean).join("-") || (p.class ?? ""),
      grade: p.grade ?? null,
      admission_number: p.admission_number ?? null,
    })) as LetterMemberOption[];
  });

/* ───────────────── templates ───────────────── */

export const listLetterTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data } = await context.supabase
      .from("letter_templates")
      .select("*")
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const setActiveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    const roles = await assertStaff(context);
    if (!roles.includes("administrator")) throw new Error("Only administrators can change the master template");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("letter_templates").update({ active: false }).neq("id", data.id);
    await supabaseAdmin.from("letter_templates").update({ active: true }).eq("id", data.id);
    return { ok: true };
  });

/** Upload a replacement master .docx. Existing letters keep their own template. */
export const uploadLetterTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { name: string; base64: string; letterhead_image_url?: string | null }) => i)
  .handler(async ({ context, data }) => {
    const roles = await assertStaff(context);
    if (!roles.includes("administrator")) throw new Error("Only administrators can replace the master template");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = Buffer.from(data.base64, "base64");
    const path = `masters/${Date.now()}-${data.name.replace(/[^a-zA-Z0-9.-]+/g, "-")}.docx`;
    const up = await supabaseAdmin.storage.from("letter-templates").upload(path, bytes, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    if (up.error) throw new Error(up.error.message);
    await supabaseAdmin.from("letter_templates").update({ active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    const { data: row, error } = await supabaseAdmin
      .from("letter_templates")
      .insert({
        name: data.name,
        storage_path: path,
        letterhead_image_url: data.letterhead_image_url ?? null,
        active: true,
        uploaded_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ───────────────── letters ───────────────── */

export const listReleaseLetters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: letters }, { data: members }, { data: profiles }] = await Promise.all([
      supabaseAdmin.from("release_letters").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("release_letter_members").select("*").order("position"),
      supabaseAdmin.from("profiles").select("id,full_name"),
    ]);
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const byLetter = new Map<string, any[]>();
    for (const m of members ?? []) {
      const list = byLetter.get(m.letter_id) ?? [];
      list.push(m);
      byLetter.set(m.letter_id, list);
    }
    return (letters ?? []).map((l) => ({
      ...l,
      created_by_name: l.created_by ? (nameById.get(l.created_by) ?? null) : null,
      students: byLetter.get(l.id) ?? [],
    })) as LetterRecord[];
  });

export const saveReleaseLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      id?: string | null;
      letter_date: string;
      event_name: string;
      body: string;
      students: LetterStudent[];
    }) => i,
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    if (!data.event_name.trim()) throw new Error("Event name is required");
    if (!data.students.length) throw new Error("At least one student is required");
    for (const s of data.students) {
      if (!s.full_name.trim() || !s.class_name.trim()) throw new Error("Every student needs a name and a class");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: template } = await supabaseAdmin
      .from("letter_templates")
      .select("id")
      .eq("active", true)
      .maybeSingle();

    let letterId = data.id ?? null;
    if (letterId) {
      const { error } = await supabaseAdmin
        .from("release_letters")
        .update({
          letter_date: data.letter_date,
          event_name: data.event_name.trim(),
          body: data.body,
        })
        .eq("id", letterId);
      if (error) throw new Error(error.message);
    } else {
      const { data: ref, error: refErr } = await supabaseAdmin.rpc("next_release_letter_ref");
      if (refErr) throw new Error(refErr.message);
      const { data: row, error } = await supabaseAdmin
        .from("release_letters")
        .insert({
          ref_no: ref as unknown as string,
          letter_date: data.letter_date,
          event_name: data.event_name.trim(),
          body: data.body,
          status: "draft",
          template_id: template?.id ?? null,
          created_by: context.userId,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      letterId = row.id;
    }

    await supabaseAdmin.from("release_letter_members").delete().eq("letter_id", letterId);
    await supabaseAdmin.from("release_letter_members").insert(
      data.students.map((s, i) => ({
        letter_id: letterId,
        member_user_id: s.member_user_id ?? null,
        full_name: s.full_name.trim(),
        class_name: s.class_name.trim(),
        position: i,
      })),
    );

    const { data: saved } = await supabaseAdmin.from("release_letters").select("*").eq("id", letterId).single();
    return saved;
  });

export const deleteReleaseLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("release_letters").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveReleaseLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; archived: boolean }) => i)
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("release_letters")
      .update({ status: data.archived ? "archived" : "generated" })
      .eq("id", data.id);
    return { ok: true };
  });

/**
 * Builds the final .docx from a fresh copy of the master template.
 * The master file in storage is only ever read, never written.
 */
export const generateReleaseLetterDocx = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => i)
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { unzipSync, zipSync, strFromU8, strToU8 } = await import("fflate");

    const { data: letter, error } = await supabaseAdmin
      .from("release_letters")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !letter) throw new Error("Letter not found");

    const { data: students } = await supabaseAdmin
      .from("release_letter_members")
      .select("*")
      .eq("letter_id", letter.id)
      .order("position");

    const templateId = letter.template_id;
    const { data: template } = templateId
      ? await supabaseAdmin.from("letter_templates").select("*").eq("id", templateId).single()
      : await supabaseAdmin.from("letter_templates").select("*").eq("active", true).single();
    if (!template) throw new Error("No master template configured");

    const dl = await supabaseAdmin.storage.from("letter-templates").download(template.storage_path);
    if (dl.error || !dl.data) throw new Error("Could not read the master template");
    const master = new Uint8Array(await dl.data.arrayBuffer());

    const files = unzipSync(master);
    const docXml = strFromU8(files["word/document.xml"]!);
    files["word/document.xml"] = strToU8(
      fillDocumentXml(docXml, {
        ref_no: letter.ref_no,
        letter_date: letter.letter_date,
        event_name: letter.event_name,
        body: letter.body ?? "",
        students: (students ?? []).map((s) => ({ full_name: s.full_name, class_name: s.class_name })),
      }),
    );
    const out = zipSync(files, { level: 6 });

    const path = `generated/${letter.ref_no}.docx`;
    await supabaseAdmin.storage.from("letter-templates").upload(path, Buffer.from(out), {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    });
    await supabaseAdmin
      .from("release_letters")
      .update({ status: "generated", docx_path: path, generated_at: new Date().toISOString(), template_id: template.id })
      .eq("id", letter.id);

    return {
      filename: `${letter.ref_no} - ${letter.event_name}.docx`,
      base64: Buffer.from(out).toString("base64"),
    };
  });
