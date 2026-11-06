import { z } from "zod";
import { MODELS } from "@/lib/assistant/constants";
import { generate } from "@/lib/assistant/generate";
import {
  AdvisorInputError,
  advisorSystem,
  buildAdvisorPrompt,
  capFiles,
  fiscalSnapshot,
  tidyText,
  type ArchiveDocument,
} from "@/lib/fiscale/advisor";
import {
  ADVISOR_MAX_FILES,
  ADVISOR_MAX_FILES_BYTES,
  ADVISOR_MAX_HISTORY,
  ADVISOR_MAX_MESSAGE,
  type AdvisorFile,
  type AdvisorReply,
} from "@/lib/fiscale/advisor-shared";
import { requireOwner } from "@/lib/fiscale/auth";
import { buildDashboard, todayInRome } from "@/lib/fiscale/data/dashboard";
import { fiscaleDb, loadDataset } from "@/lib/fiscale/data/load";
import { pdfText } from "@/lib/fiscale/pdf-text";

// Fiscal chat: the answer comes from Claude Code on the owner's server through
// the n8n webhook of the study assistant, with web search turned on. 300 s is
// the route limit; generate() stops just before it.
export const maxDuration = 300;

const ADVISOR_EFFORT = "medium";
const TEXT_FILE = /\.(txt|eml|md|xml|csv)$/i;

const FileSchema = z.object({ name: z.string().trim().min(1).max(200), text: z.string().max(20_000) });
const Payload = z.object({
  message: z.string().trim().min(1).max(ADVISOR_MAX_MESSAGE),
  model: z.enum(MODELS.map((m) => m.id) as [string, ...string[]]).optional().catch(undefined),
  webSearch: z.boolean().default(true),
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

async function readFile(file: File): Promise<AdvisorFile> {
  const name = file.name || "allegato";
  if (/\.pdf$/i.test(name)) {
    let text = "";
    try {
      text = tidyText(await pdfText(await file.arrayBuffer()));
    } catch (e) {
      console.error("[fiscale] chat pdf:", e instanceof Error ? e.message : e);
      throw new HttpError(`"${name}": non riesco ad aprire il PDF.`, 422);
    }
    if (text.length < 40) {
      throw new HttpError(`"${name}" è una scansione senza testo: incolla il testo nel messaggio.`, 422);
    }
    return { name, text };
  }
  if (TEXT_FILE.test(name)) {
    const text = tidyText(new TextDecoder("utf-8").decode(await file.arrayBuffer()));
    if (!text) throw new HttpError(`"${name}" è vuoto.`, 422);
    return { name, text };
  }
  throw new HttpError(`"${name}": allega PDF o file di testo (txt, eml, md, xml, csv). Per le immagini incolla il testo.`, 415);
}

async function loadArchive(): Promise<ArchiveDocument[]> {
  const db = await fiscaleDb();
  const { data, error } = await db
    .from("documents")
    .select("title, category, year")
    .order("year", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) {
    console.error("[fiscale] chat archive:", error.message);
    return [];
  }
  return (data ?? []).map((d) => ({ title: String(d.title), category: String(d.category), year: d.year as number | null }));
}

export async function POST(request: Request) {
  try {
    await requireOwner();
  } catch {
    return fail("Non autorizzato", 401);
  }

  try {
    const form = await request.formData().catch(() => null);
    if (!form) throw new HttpError("Richiesta non valida", 400);
    let raw: unknown = null;
    try {
      raw = JSON.parse(String(form.get("payload") ?? ""));
    } catch {
      raw = null;
    }
    const parsed = Payload.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new HttpError(`Richiesta non valida: ${issue?.path.join(".") || "payload"} ${issue?.message ?? ""}`, 422);
    }
    const { message, model, webSearch, history } = parsed.data;

    const uploads = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (uploads.length > ADVISOR_MAX_FILES) throw new HttpError(`Al massimo ${ADVISOR_MAX_FILES} allegati per messaggio.`, 413);
    if (uploads.reduce((s, f) => s + f.size, 0) > ADVISOR_MAX_FILES_BYTES) {
      throw new HttpError("Allegati troppo grandi: al massimo 4 MB in tutto.", 413);
    }

    const [files, data, archive] = await Promise.all([
      Promise.all(uploads.map(readFile)).then(capFiles),
      loadDataset(),
      loadArchive(),
    ]);

    const asOf = todayInRome();
    const snapshot = fiscalSnapshot({ data, dashboard: buildDashboard(data, asOf), archive, asOf });
    const system = advisorSystem({ webSearch });
    const { prompt, turns } = buildAdvisorPrompt({
      system,
      snapshot,
      history: history.slice(-ADVISOR_MAX_HISTORY * 2),
      message,
      files,
    });

    const result = await generate({ system, prompt, model, effort: ADVISOR_EFFORT, webSearch, signal: request.signal });

    console.log("[fiscale] chat", {
      model: result.model,
      webSearch,
      files: files.length,
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
