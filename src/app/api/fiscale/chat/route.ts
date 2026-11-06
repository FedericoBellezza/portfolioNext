import { z } from "zod";
import { MODELS } from "@/lib/assistant/constants";
import { ExtractionError, extractDocument } from "@/lib/assistant/extract";
import { generate } from "@/lib/assistant/generate";
import {
  AdvisorInputError,
  advisorSystem,
  archiveFileName,
  buildAdvisorPrompt,
  capFiles,
  fiscalSnapshot,
  tidyText,
  type ArchiveDocument,
} from "@/lib/fiscale/advisor";
import {
  ADVISOR_BUCKET,
  ADVISOR_IMAGE,
  ADVISOR_MAX_FILE_BYTES,
  ADVISOR_MAX_FILES,
  ADVISOR_MAX_HISTORY,
  ADVISOR_MAX_MESSAGE,
  extensionOf,
  type AdvisorFile,
  type AdvisorReply,
} from "@/lib/fiscale/advisor-shared";
import { requireOwner } from "@/lib/fiscale/auth";
import { buildDashboard, todayInRome } from "@/lib/fiscale/data/dashboard";
import { fiscaleDb, loadDataset } from "@/lib/fiscale/data/load";
import { DOCUMENT_BUCKET } from "@/lib/fiscale/documents";
import { pdfText } from "@/lib/fiscale/file-text";
import { createClient } from "@/lib/supabase/server";

// Fiscal chat: the answer comes from Claude Code on the owner's server through
// the n8n webhook of the study assistant, with web search and a folder of files
// Claude can open (archive documents, photos and scans attached in the chat),
// downloaded by n8n from short-lived signed links. 300 s is the route limit;
// generate() stops just before it.
export const maxDuration = 300;

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Link = { name: string; url: string };

const ADVISOR_EFFORT = "medium";
const TEXT_FILE = /^(txt|eml|md|xml|csv)$/;
/** Files n8n takes per request (MAX_FILES in the workflow): the chat's files first, then the archive. */
const MAX_FOLDER_FILES = 150;
const MAX_ARCHIVE_FILES = 100;
/** Photos and long files of earlier turns that go back to the folder. */
const MAX_EARLIER_FILES = 20;
/** Files Claude opens whole with Read; Word and PowerPoint get a text copy instead. */
const CLAUDE_READABLE = /^(pdf|txt|md|csv|xml|eml)$/;
/** Long enough for n8n to download the files before Claude starts, then useless. */
const LINK_SECONDS = 600;
/** Chat attachments are removed this long after upload. */
const ATTACHMENT_DAYS = 30;

const FileSchema = z.object({
  name: z.string().trim().min(1).max(200),
  text: z.string().max(20_000),
  path: z.string().min(1).max(400).optional(),
});
const Payload = z.object({
  message: z.string().trim().min(1).max(ADVISOR_MAX_MESSAGE),
  model: z.enum(MODELS.map((m) => m.id) as [string, ...string[]]).optional().catch(undefined),
  webSearch: z.boolean().default(true),
  /** Files the browser has just uploaded to the chat bucket. */
  attachments: z
    .array(z.object({ path: z.string().min(1).max(400), name: z.string().trim().min(1).max(200) }))
    .max(ADVISOR_MAX_FILES)
    .default([]),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(ADVISOR_MAX_MESSAGE * 2),
        files: z.array(FileSchema).max(ADVISOR_MAX_FILES).optional(),
      }),
    )
    .max(ADVISOR_MAX_HISTORY * 2)
    .default([]),
});

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const fail = (error: string, status: number) => Response.json({ ok: false, error }, { status });

/** n8n refuses links with spaces, quotes or backslashes (they end up in a shell command). */
const safeUrl = (url: string) =>
  url.replace(/[\s'"`\\]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);

/** Only the user's own uploads, never a path that climbs out of their folder. */
const ownPath = (path: string, userId: string) => path.startsWith(`${userId}/`) && !path.includes("..");

/** Text of an attachment; photos and PDFs without text are left to Claude, who opens the file. */
async function readAttachment(supabase: Supabase, a: { path: string; name: string }): Promise<AdvisorFile> {
  const { name, path } = a;
  if (ADVISOR_IMAGE.test(path)) return { name, text: "", path };

  const { data, error } = await supabase.storage.from(ADVISOR_BUCKET).download(path);
  if (error || !data) throw new HttpError(`"${name}": file non trovato, riprova ad allegarlo.`, 404);
  if (data.size > ADVISOR_MAX_FILE_BYTES) throw new HttpError(`"${name}" è troppo grande (massimo 15 MB).`, 413);
  const bytes = await data.arrayBuffer();
  const ext = extensionOf(path);

  if (ext === "pdf") {
    let text = "";
    try {
      text = tidyText(await pdfText(bytes));
    } catch (e) {
      console.error("[fiscale] chat pdf:", e instanceof Error ? e.message : e);
    }
    // A scan has no text layer: Claude reads the pages as images.
    return text.length >= 40 ? { name, text } : { name, text: "", path };
  }
  if (ext === "docx" || ext === "pptx") {
    try {
      const doc = await extractDocument({ buffer: Buffer.from(bytes), fileName: path });
      const text = tidyText(
        (doc.units as { text: string; page?: number; heading?: string }[])
          .map((u) => (u.page ? `[slide ${u.page}] ${u.text}` : u.heading ? `## ${u.heading}\n${u.text}` : u.text))
          .join("\n\n"),
      );
      if (!text) throw new ExtractionError("vuoto");
      return { name, text };
    } catch (e) {
      if (!(e instanceof ExtractionError)) console.error("[fiscale] chat office:", e);
      throw new HttpError(`"${name}": non riesco a leggerne il testo.`, 422);
    }
  }
  if (TEXT_FILE.test(ext)) {
    const text = tidyText(new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, ""));
    if (!text) throw new HttpError(`"${name}" è vuoto.`, 422);
    return { name, text };
  }
  throw new HttpError(`"${name}": tipo di file non supportato.`, 415);
}

/**
 * A long attachment keeps an excerpt in the prompt and its whole text in
 * Claude's folder: the file itself when Claude can read it, a text copy for
 * Word and PowerPoint. Without a copy the excerpt alone goes on.
 */
async function keepWholeText(
  supabase: Supabase,
  userId: string,
  read: AdvisorFile,
  capped: AdvisorFile,
  original: string,
): Promise<AdvisorFile> {
  if (capped.path || capped.text === read.text) return capped;
  if (CLAUDE_READABLE.test(extensionOf(original))) return { ...capped, path: original };
  const base = read.name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 80);
  const path = `${userId}/${crypto.randomUUID()}-${base || "testo"}.txt`;
  const { error } = await supabase.storage
    .from(ADVISOR_BUCKET)
    .upload(path, new Blob([read.text], { type: "text/plain" }), { contentType: "text/plain" });
  if (error) {
    console.error("[fiscale] chat text copy:", error.message);
    return capped;
  }
  return { ...capped, path };
}

/**
 * The owner's archive: titles for the snapshot and signed links for the most
 * recent documents (as many as `slots`), which n8n downloads into Claude's working folder.
 */
async function loadArchive(supabase: Supabase, slots: number): Promise<{ archive: ArchiveDocument[]; links: Link[] }> {
  const db = await fiscaleDb();
  const { data, error } = await db
    .from("documents")
    .select("id, title, category, year, file_path")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) {
    console.error("[fiscale] chat archive:", error.message);
    return { archive: [], links: [] };
  }
  const rows = data ?? [];
  const withFile = rows.slice(0, slots);
  const { data: signed, error: signError } = withFile.length
    ? await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrls(withFile.map((d) => String(d.file_path)), LINK_SECONDS)
    : { data: [], error: null };
  if (signError) console.error("[fiscale] chat signed links:", signError.message);
  const urlOf = new Map((signed ?? []).filter((s) => s.path && s.signedUrl).map((s) => [s.path as string, s.signedUrl]));

  const links: Link[] = [];
  const archive = rows.map((d, i): ArchiveDocument => {
    const url = i < slots ? urlOf.get(String(d.file_path)) : undefined;
    const file = url ? archiveFileName(links.length, String(d.title), String(d.file_path)) : null;
    if (url && file) links.push({ name: file, url: safeUrl(url) });
    return { id: String(d.id), title: String(d.title), category: String(d.category), year: d.year as number | null, file };
  });
  return { archive, links };
}

/** Photos and scans to open, newest first: names in the folder and signed links. */
async function attachmentLinks(supabase: Supabase, paths: string[]): Promise<{ openable: Map<string, string>; links: Link[] }> {
  const openable = new Map<string, string>();
  const links: Link[] = [];
  if (paths.length === 0) return { openable, links };
  const { data, error } = await supabase.storage.from(ADVISOR_BUCKET).createSignedUrls(paths, LINK_SECONDS);
  if (error) console.error("[fiscale] chat attachment links:", error.message);
  for (const s of data ?? []) {
    if (!s.path || !s.signedUrl) continue;
    const base = s.path.split("/").pop() ?? "allegato";
    const ext = extensionOf(base) || "jpg";
    const name = `allegato-${String(links.length + 1).padStart(2, "0")}.${ext}`;
    openable.set(s.path, name);
    links.push({ name, url: safeUrl(s.signedUrl) });
  }
  return { openable, links };
}

/** Best effort: chat uploads older than ATTACHMENT_DAYS are removed. */
async function removeOldAttachments(supabase: Supabase, userId: string) {
  const { data, error } = await supabase.storage
    .from(ADVISOR_BUCKET)
    .list(userId, { limit: 100, sortBy: { column: "created_at", order: "asc" } });
  if (error || !data) return;
  const limit = Date.now() - ATTACHMENT_DAYS * 86_400_000;
  const old = data.filter((f) => f.created_at && Date.parse(f.created_at) < limit).map((f) => `${userId}/${f.name}`);
  if (old.length) {
    const { error: e } = await supabase.storage.from(ADVISOR_BUCKET).remove(old);
    if (e) console.warn("[fiscale] chat cleanup:", e.message);
  }
}

export async function POST(request: Request) {
  let userId: string;
  try {
    userId = (await requireOwner()).id;
  } catch {
    return fail("Non autorizzato", 401);
  }

  try {
    const parsed = Payload.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new HttpError(`Richiesta non valida: ${issue?.path.join(".") || "body"} ${issue?.message ?? ""}`, 422);
    }
    const { message, model, webSearch, attachments } = parsed.data;
    if (attachments.some((a) => !ownPath(a.path, userId))) throw new HttpError("Allegato non valido.", 400);
    // Earlier photos stay available only if they are the user's own uploads.
    const history = parsed.data.history.slice(-ADVISOR_MAX_HISTORY * 2).map((t) => ({
      ...t,
      files: t.files?.map((f) => (f.path && !ownPath(f.path, userId) ? { name: f.name, text: f.text } : f)),
    }));

    const supabase = await createClient();
    const [read, data] = await Promise.all([
      Promise.all(attachments.map((a) => readAttachment(supabase, a))),
      loadDataset(),
      removeOldAttachments(supabase, userId),
    ]);
    // Many or long files share the text room: what is cut stays readable whole in the folder.
    const capped = capFiles(read);
    const files = await Promise.all(
      capped.map((f, i) => keepWholeText(supabase, userId, read[i], f, attachments[i].path)),
    );

    // Files of this message first, then those of earlier turns (newest first).
    const current = files.map((f) => f.path).filter((p): p is string => Boolean(p));
    const earlier = history
      .flatMap((t) => t.files ?? [])
      .reverse()
      .map((f) => f.path)
      .filter((p): p is string => Boolean(p) && !current.includes(p as string))
      .filter((p, i, all) => all.indexOf(p) === i)
      .slice(0, MAX_EARLIER_FILES);
    const toOpen = [...current, ...earlier].slice(0, MAX_FOLDER_FILES);
    const [{ openable, links: attachmentFiles }, { archive, links: archiveLinks }] = await Promise.all([
      attachmentLinks(supabase, toOpen),
      loadArchive(supabase, Math.max(0, Math.min(MAX_ARCHIVE_FILES, MAX_FOLDER_FILES - toOpen.length))),
    ]);

    // Demo data have no files of their own: only the chat's photos go to the folder.
    const folder = [...(data.source === "supabase" ? archiveLinks : []), ...attachmentFiles];
    const asOf = todayInRome();
    const snapshot = fiscalSnapshot({
      data,
      dashboard: buildDashboard(data, asOf),
      archive: data.source === "supabase" ? archive : archive.map((a) => ({ ...a, file: null })),
      asOf,
    });
    const system = advisorSystem({ webSearch, documents: folder.length > 0 });
    const { prompt, turns } = buildAdvisorPrompt({ system, snapshot, history, message, files, openable });

    const result = await generate({
      system,
      prompt,
      model,
      effort: ADVISOR_EFFORT,
      webSearch,
      files: folder,
      signal: request.signal,
    });

    console.log("[fiscale] chat", {
      model: result.model,
      webSearch,
      attachments: files.length,
      folder: folder.length,
      turns,
      chars: system.length + prompt.length,
      durationMs: result.durationMs,
      costUsd: result.costUsd,
    });

    const reply: AdvisorReply = { ok: true, text: result.text, files, model: result.model, durationMs: result.durationMs };
    return Response.json(reply);
  } catch (error) {
    if (error instanceof HttpError) return fail(error.message, error.status);
    if (error instanceof AdvisorInputError) return fail(error.message, 413);
    // AssistantError from generate(): message and status are meant for the user.
    if (error instanceof Error && typeof (error as { status?: unknown }).status === "number") {
      return fail(error.message, (error as unknown as { status: number }).status);
    }
    console.error("[fiscale] chat:", error);
    return fail("Errore interno: riprova.", 500);
  }
}
