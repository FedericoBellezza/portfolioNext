"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/fiscale/auth";
import { FatturaPaError, progressivoAttempt } from "@/lib/fiscale/fatturapa";
import { loadInvoiceForXml, renderInvoiceXml, snapshotOf } from "@/lib/fiscale/data/invoice-xml";
import { fiscaleDb } from "@/lib/fiscale/data/load";

export type InvoiceActionState = { ok: boolean; message: string } | null;

const UUID = /^[0-9a-f-]{36}$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const todayRome = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

async function ctx() {
  await requireOwner();
  return fiscaleDb();
}

const revalidate = (id: string) => {
  revalidatePath("/dashboard/fiscale", "layout");
  revalidatePath(`/dashboard/fiscale/fatture/${id}`);
};

/** Assigns the number (gap-free, via fiscale.issue_invoice) and freezes the XML. */
export async function issueInvoiceAction(_prev: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
  let db;
  try {
    db = await ctx();
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }
  const id = String(formData.get("id") ?? "");
  const issueDate = String(formData.get("issueDate") ?? "");
  if (!UUID.test(id) || !ISO.test(issueDate)) return { ok: false, message: "Dati non validi." };
  if (issueDate > todayRome()) return { ok: false, message: "La data di emissione non può essere futura." };

  const loaded = await loadInvoiceForXml(db, id);
  if (!loaded || loaded.invoice.status !== "draft") return { ok: false, message: "Bozza non trovata." };
  if (!loaded.profile) return { ok: false, message: "Crea prima il profilo fiscale." };
  if (!loaded.currentClient) return { ok: false, message: "Cliente non trovato." };
  if (loaded.items.length === 0) return { ok: false, message: "La fattura non ha righe." };

  // Numbers must follow the dates: no invoice dated before the last issued one.
  const year = Number(issueDate.slice(0, 4));
  const { data: last } = await db
    .from("invoices")
    .select("issue_date, number")
    .eq("status", "issued")
    .eq("fiscal_year", year)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last?.issue_date && String(last.issue_date) > issueDate) {
    return { ok: false, message: `La data deve essere uguale o successiva all'ultima fattura (${last.issue_date}).` };
  }

  // Keep the payment terms of the draft relative to the real issue date.
  const draftIssue = loaded.invoice.issue_date ? String(loaded.invoice.issue_date) : issueDate;
  const terms = loaded.invoice.due_date ? Math.max(0, daysBetween(draftIssue, String(loaded.invoice.due_date))) : 30;
  const dueDate = addDays(issueDate, terms);

  // Dry run before consuming a number: catches incomplete profile or client data.
  try {
    renderInvoiceXml({
      invoice: loaded.invoice,
      items: loaded.items,
      profile: loaded.profile,
      client: loaded.currentClient,
      number: (Number(last?.number) || 0) + 1,
      fiscalYear: year,
      issueDate,
      dueDate,
    });
  } catch (e) {
    return { ok: false, message: e instanceof FatturaPaError ? e.message : "Dati della fattura non validi." };
  }

  const pre = await db.from("invoices").update({ due_date: dueDate }).eq("id", id);
  if (pre.error) return { ok: false, message: "Salvataggio non riuscito." };

  const issued = await db.rpc("issue_invoice", { p_invoice_id: id, p_issue_date: issueDate });
  if (issued.error) {
    console.error("[fiscale] issue_invoice:", issued.error.message);
    return { ok: false, message: "Emissione non riuscita." };
  }

  // Re-read the frozen data (number, snapshot) and store the XML that will be sent.
  const after = await loadInvoiceForXml(db, id);
  if (!after) return { ok: false, message: "Fattura emessa, ma non riletta: ricarica la pagina." };
  const { xml, filename } = renderInvoiceXml({
    invoice: after.invoice,
    items: after.items,
    profile: after.profile!,
    client: after.invoice.client_snapshot as Record<string, unknown>,
  });
  const saved = await db
    .from("invoices")
    .update({ xml_payload: xml, sdi_filename: filename, payment_iban: after.profile?.iban ?? null })
    .eq("id", id);
  if (saved.error) console.error("[fiscale] save xml:", saved.error.message);

  revalidate(id);
  return { ok: true, message: `Fattura n. ${after.invoice.number}/${after.invoice.fiscal_year} emessa.` };
}

const SDI_STATUSES = ["sent", "delivered", "not_delivered", "rejected"] as const;

/** Manual SdI status, for invoices uploaded on the Agenzia delle Entrate portal. */
export async function updateSdiStatusAction(_prev: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
  let db;
  try {
    db = await ctx();
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as (typeof SDI_STATUSES)[number];
  const identifier = String(formData.get("identifier") ?? "").trim().slice(0, 30) || null;
  if (!UUID.test(id) || !SDI_STATUSES.includes(status)) return { ok: false, message: "Dati non validi." };
  if (identifier && !/^\d+$/.test(identifier)) return { ok: false, message: "L'identificativo SdI è un numero." };

  const { error } = await db
    .from("invoices")
    .update({ sdi_status: status, sdi_identifier: identifier, sdi_provider: "portale-ade", sdi_updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "issued");
  if (error) return { ok: false, message: "Salvataggio non riuscito." };
  revalidate(id);
  return { ok: true, message: "Stato aggiornato." };
}

/**
 * Builds the XML again. After an SdI rejection it takes the current client data,
 * keeps number and date, uses a new file name and puts the invoice back to
 * "da inviare". Without a rejection it only fills a missing XML.
 */
export async function regenerateXmlAction(formData: FormData): Promise<void> {
  const db = await ctx();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const loaded = await loadInvoiceForXml(db, id);
  if (!loaded?.profile || loaded.invoice.status !== "issued") return;
  const rejected = loaded.invoice.sdi_status === "rejected";
  if (!rejected && loaded.invoice.xml_payload) return;
  if (rejected && !loaded.currentClient) return;

  const current = loaded.invoice.sdi_filename ? String(loaded.invoice.sdi_filename) : null;
  const previous = current ? progressivoAttempt(current.replace(/^.*_|\.xml$/g, "")) : -1;
  const snapshot = rejected
    ? snapshotOf(loaded.currentClient!)
    : (loaded.invoice.client_snapshot as Record<string, unknown>);
  let rendered;
  try {
    rendered = renderInvoiceXml({
      invoice: loaded.invoice,
      items: loaded.items,
      profile: loaded.profile,
      client: snapshot,
      attempt: rejected ? Math.min(previous + 1, 9) : Math.max(previous, 0),
    });
  } catch (e) {
    console.error("[fiscale] render xml:", e instanceof Error ? e.message : e);
    return;
  }
  const { error } = await db
    .from("invoices")
    .update({
      ...(rejected ? { client_snapshot: snapshot, sdi_status: "not_sent", sdi_identifier: null } : {}),
      xml_payload: rendered.xml,
      sdi_filename: rendered.filename,
      sdi_updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) console.error("[fiscale] regenerate xml:", error.message);
  revalidate(id);
}

export async function deleteDraftAction(formData: FormData): Promise<void> {
  const db = await ctx();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const { error } = await db.from("invoices").delete().eq("id", id).eq("status", "draft");
  if (error) console.error("[fiscale] delete draft:", error.message);
  revalidatePath("/dashboard/fiscale", "layout");
  redirect("/dashboard/fiscale/fatture");
}

/** Cash collection on an issued invoice: its date decides the tax year (principio di cassa). */
export async function registerCollectionAction(_prev: InvoiceActionState, formData: FormData): Promise<InvoiceActionState> {
  let db;
  try {
    db = await ctx();
  } catch {
    return { ok: false, message: "Non autorizzato." };
  }
  const id = String(formData.get("id") ?? "");
  const collectedAt = String(formData.get("collectedAt") ?? "");
  const raw = String(formData.get("amount") ?? "").trim();
  const amount = Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
  if (!UUID.test(id) || !ISO.test(collectedAt)) return { ok: false, message: "Dati non validi." };
  if (collectedAt > todayRome()) return { ok: false, message: "La data d'incasso non può essere futura." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: "Importo non valido." };

  const { data: invoice } = await db.from("invoices").select("status, total_amount, issue_date").eq("id", id).maybeSingle();
  if (!invoice || invoice.status !== "issued") return { ok: false, message: "Si registrano incassi solo su fatture emesse." };
  if (invoice.issue_date && collectedAt < String(invoice.issue_date)) {
    return { ok: false, message: "La data d'incasso è precedente alla data della fattura." };
  }
  const { data: paid } = await db.from("invoice_payments").select("amount").eq("invoice_id", id);
  const already = (paid ?? []).reduce((s, p) => s + Number(p.amount), 0);
  if (already + amount > Number(invoice.total_amount) + 0.005) {
    const left = (Number(invoice.total_amount) - already).toFixed(2).replace(".", ",");
    return { ok: false, message: `Supera il totale: restano da incassare ${left} €.` };
  }

  const { error } = await db
    .from("invoice_payments")
    .insert({ invoice_id: id, collected_at: collectedAt, amount: Math.round(amount * 100) / 100, method: "bonifico" });
  if (error) {
    console.error("[fiscale] insert collection:", error.message);
    return { ok: false, message: "Salvataggio non riuscito." };
  }
  revalidate(id);
  return { ok: true, message: "Incasso registrato." };
}

export async function deleteCollectionAction(formData: FormData): Promise<void> {
  const db = await ctx();
  const id = String(formData.get("invoiceId") ?? "");
  const paymentId = String(formData.get("paymentId") ?? "");
  if (!UUID.test(id) || !UUID.test(paymentId)) return;
  const { error } = await db.from("invoice_payments").delete().eq("id", paymentId).eq("invoice_id", id);
  if (error) console.error("[fiscale] delete collection:", error.message);
  revalidate(id);
}
