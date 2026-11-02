import { z } from "zod";
import { AssistantError, errorResponse, requireOwner } from "@/lib/assistant/auth";
import { EFFORTS, MODELS } from "@/lib/assistant/constants";
import { generate } from "@/lib/assistant/generate";
import { buildGradePrompts, parseGrades } from "@/lib/assistant/quiz";

// Come la chat: con Opus o effort alti la correzione può superare il minuto.
export const maxDuration = 300;

// Le risposte aperte di un quiz si correggono tutte insieme, a fine quiz: una sola generazione.
const BodySchema = z.object({
  items: z
    .array(
      z.object({
        // La consegna di un esercizio di codice include lo snippet: lascia più spazio.
        question: z.string().trim().min(1).max(4000),
        reference: z.string().trim().min(1).max(3000),
        answer: z.string().trim().min(1).max(6000),
        kind: z.enum(["open", "code"]).default("open"),
        language: z.string().trim().max(30).optional(),
      }),
    )
    .min(1)
    .max(20),
  model: z.enum(MODELS.map((item) => item.id)).optional().catch(undefined),
  effort: z.enum(EFFORTS.map((item) => item.id)).optional().catch(undefined),
});

export async function POST(request) {
  try {
    await requireOwner();

    const parsed = BodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AssistantError(`Richiesta non valida: ${issue?.path.join(".") || "body"} ${issue?.message ?? ""}`, 422);
    }
    const { items, model, effort } = parsed.data;

    const { system, prompt } = buildGradePrompts(items);
    const result = await generate({ system, prompt, model, effort, signal: request.signal });

    const grades = parseGrades(result.text, items.length);
    if (grades.every((grade) => !grade)) {
      throw new AssistantError("Non sono riuscito a valutare le risposte: riprova", 502);
    }

    console.log("[assistant] quiz grade", {
      items: items.length,
      graded: grades.filter(Boolean).length,
      model: result.model,
      effort,
      durationMs: result.durationMs,
      costUsd: result.costUsd,
    });

    return Response.json({ ok: true, grades });
  } catch (error) {
    return errorResponse(error);
  }
}
