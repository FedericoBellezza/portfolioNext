import { createClient } from "@/lib/supabase/server";

export class AssistantError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "AssistantError";
    this.status = status;
  }
}

/**
 * Il middleware non copre /api/*: ogni route dell'assistente deve chiamare questa funzione.
 * Nessun fallback su OWNER_EMAIL: se manca, meglio un errore chiaro che una porta aperta.
 */
export async function requireOwner() {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail) {
    throw new AssistantError("OWNER_EMAIL non configurata sul server", 500);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new AssistantError("Non autenticato", 401);
  if (user.email?.toLowerCase() !== ownerEmail) {
    throw new AssistantError("Accesso negato", 403);
  }

  return { supabase, user };
}

export function errorResponse(error) {
  if (error instanceof AssistantError) {
    return Response.json({ ok: false, error: error.message }, { status: error.status });
  }
  console.error("[assistant] errore non gestito:", error);
  return Response.json({ ok: false, error: "Errore interno" }, { status: 500 });
}
