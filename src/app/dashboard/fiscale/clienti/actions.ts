"use server";

import { revalidatePath } from "next/cache";
import { requireFiscaleUser } from "@/lib/fiscale/auth";
import { ClientSchema, normaliseClientForm, toClientRow } from "@/lib/fiscale/clients";
import { fiscaleDb } from "@/lib/fiscale/data/load";

export type ClientFormState =
  | { ok: true; message: string }
  | { ok: false; message: string; field?: string }
  | null;

export async function createClientAction(_prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  try {
    await requireFiscaleUser();
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }

  const parsed = ClientSchema.safeParse(normaliseClientForm(Object.fromEntries(formData)));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: issue?.message ?? "Dati non validi.", field: issue?.path[0]?.toString() };
  }

  const db = await fiscaleDb();
  const { data: profile } = await db.from("fiscal_profiles").select("user_id").maybeSingle();
  if (!profile) return { ok: false, message: "Modalità demo: crea prima il profilo fiscale." };

  const { error } = await db.from("clients").insert(toClientRow(parsed.data));
  if (error) {
    console.error("[fiscale] insert client:", error.message);
    return { ok: false, message: "Salvataggio non riuscito: controlla i dati inseriti." };
  }

  revalidatePath("/dashboard/fiscale", "layout");
  return { ok: true, message: "Cliente aggiunto." };
}

/** Archived clients disappear from lists; their invoices keep the data snapshot. */
export async function archiveClientAction(formData: FormData): Promise<void> {
  await requireFiscaleUser();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  const db = await fiscaleDb();
  const { error } = await db.from("clients").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) console.error("[fiscale] archive client:", error.message);
  revalidatePath("/dashboard/fiscale", "layout");
}
