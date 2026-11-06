"use server";

import { revalidatePath } from "next/cache";
import { requireFiscaleUser } from "@/lib/fiscale/auth";
import { fiscaleDb } from "@/lib/fiscale/data/load";
import { ProfileSchema, normaliseProfileForm, toProfileRow } from "@/lib/fiscale/profile";

export type ProfileFormState =
  | { ok: true; message: string; created: boolean }
  | { ok: false; message: string; field?: string }
  | null;

/** Creates the user's fiscal profile, or updates it: one row per user (RLS on user_id). */
export async function saveProfileAction(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  let userId: string;
  try {
    userId = (await requireFiscaleUser()).id;
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }

  const parsed = ProfileSchema.safeParse(normaliseProfileForm(Object.fromEntries(formData)));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: issue?.message ?? "Dati non validi.", field: issue?.path[0]?.toString() };
  }

  const db = await fiscaleDb();
  const { data: existing } = await db.from("fiscal_profiles").select("user_id").maybeSingle();
  const { error } = await db
    .from("fiscal_profiles")
    .upsert({ user_id: userId, ...toProfileRow(parsed.data) }, { onConflict: "user_id" });
  if (error) {
    console.error("[fiscale] save profile:", error.message);
    return { ok: false, message: "Salvataggio non riuscito: controlla i dati inseriti." };
  }

  revalidatePath("/dashboard/fiscale", "layout");
  return existing
    ? { ok: true, created: false, message: "Profilo aggiornato: i calcoli usano già i nuovi dati." }
    : { ok: true, created: true, message: "Profilo creato: da ora la dashboard mostra i tuoi dati." };
}
