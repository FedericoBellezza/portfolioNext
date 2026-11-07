import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { FileCheck } from "./data/types";
import { DOCUMENT_BUCKET, storedFileName } from "./documents";
import { matchF24, type DocumentPayment } from "./f24-match";
import { formatEUR, toEuro, type Cents } from "./money";
import { obligationTarget, type ObligationTarget } from "./obligations";
import { CHECK_KINDS, paymentLabel } from "./receipts";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Db = ReturnType<Supabase["schema"]>;

export const COMPENSATED_NOTE = "Pagato in compensazione con un credito d'imposta";

export const linkColumn = (table: ObligationTarget["table"]) => (table === "inps_payments" ? "inps_payment_id" : "tax_payment_id");

/**
 * Writes the payment of a calendar item. `duplicate` when one is already
 * recorded for it (one payment per obligation, see migration 0007).
 */
export async function insertObligationPayment(
  db: Db,
  target: ObligationTarget,
  p: { paidAt: string; amount: Cents; reference?: string | null; notes?: string | null },
): Promise<{ id: string } | { error: string; duplicate: boolean }> {
  const common = { paid_at: p.paidAt, competence_year: target.competenceYear, kind: target.kind, amount: toEuro(p.amount), f24_reference: p.reference ?? null, notes: p.notes ?? null };
  const { data, error } =
    target.table === "inps_payments"
      ? await db.from("inps_payments").insert({ ...common, f24_causale: target.causale }).select("id").single()
      : await db.from("tax_payments").insert({ ...common, tribute_code: target.tributeCode ?? null }).select("id").single();
  if (error || !data) return { error: error?.message ?? "no row", duplicate: error?.code === "23505" };
  return { id: String(data.id) };
}

async function existingPayment(db: Db, target: ObligationTarget): Promise<string | null> {
  const { data } = await db.from(target.table).select("id").eq("kind", target.kind).eq("competence_year", target.competenceYear).maybeSingle();
  return data ? String(data.id) : null;
}

export interface PaymentOutcome {
  /** e.g. "INPS fissi 2ª rata 2026" or the F24 code when not matched. */
  label: string;
  result: "registered" | "linked" | "skipped";
  detail: string;
}

/**
 * After a payment file has been saved to the archive: each F24 line that fits
 * a calendar item gets its payment recorded (when the file proves it was paid
 * and none is recorded yet) and the file linked to it. The first payment gets
 * the archive row itself, the others a copy of the file, as when the owner
 * uploads the same F24 on each item by hand.
 */
export async function applyDocumentPayment(
  supabase: Supabase,
  doc: { id: string; path: string; mime: string; size: number },
  payment: DocumentPayment,
  today: string,
): Promise<PaymentOutcome[]> {
  const db = supabase.schema("fiscale");
  const match = matchF24(payment);
  const outcomes: PaymentOutcome[] = match.unmatched.map((u) => ({ label: `Codice ${u.code}`, result: "skipped", detail: u.reason }));
  const kindLabel = CHECK_KINDS[payment.kind]?.label ?? "Documento";
  let docUsed = false;

  for (const ob of match.obligations) {
    const target = obligationTarget(ob.key);
    if (!target) continue;
    const label = paymentLabel({ table: target.table === "inps_payments" ? "inps" : "tax", kind: target.kind, competenceYear: target.competenceYear });

    let paymentId = await existingPayment(db, target);
    let registered = false;
    if (!paymentId) {
      const why = !match.final
        ? `${kindLabel.toLowerCase()}: non prova il pagamento, registralo quando hai la quietanza`
        : !match.date
          ? "data del versamento non letta"
          : match.date > today
            ? "data del versamento futura"
            : null;
      if (why) {
        outcomes.push({ label, result: "skipped", detail: why });
        continue;
      }
      const res = await insertObligationPayment(db, target, {
        paidAt: match.date!,
        amount: ob.amount,
        notes: match.compensated ? COMPENSATED_NOTE : null,
      });
      if ("id" in res) {
        paymentId = res.id;
        registered = true;
      } else if (res.duplicate) {
        // Another file of the same F24 got there first (files are read in parallel).
        paymentId = await existingPayment(db, target);
      } else {
        console.error("[fiscale] auto payment:", res.error);
      }
      if (!paymentId) {
        outcomes.push({ label, result: "skipped", detail: "salvataggio non riuscito" });
        continue;
      }
    }

    // What Claude read stands as the check of the file: no second reading needed.
    const check: FileCheck = {
      status: "ok",
      kind: CHECK_KINDS[payment.kind] ? payment.kind : "altro",
      final: match.final,
      date: match.date,
      amount: toEuro(ob.amount),
      matches: true,
      note: null,
      checkedAt: new Date().toISOString(),
    };
    const link = { [linkColumn(target.table)]: paymentId, provisional: !match.final, ai_check: check };
    let linked = false;
    if (!docUsed) {
      const { error } = await db.from("documents").update(link).eq("id", doc.id);
      linked = !error;
      if (error) console.error("[fiscale] link document:", error.message);
      else docUsed = true;
    } else {
      const title = `${kindLabel} – ${label}`;
      const [userId] = doc.path.split("/");
      const to = `${userId}/${crypto.randomUUID()}/${storedFileName(title, doc.path)}`;
      const copied = await supabase.storage.from(DOCUMENT_BUCKET).copy(doc.path, to);
      if (copied.error) console.error("[fiscale] copy payment file:", copied.error.message);
      else {
        const { error } = await db.from("documents").insert({
          title,
          category: "f24",
          year: target.competenceYear,
          file_path: to,
          mime_type: doc.mime,
          size_bytes: doc.size,
          ...link,
        });
        linked = !error;
        if (error) {
          console.error("[fiscale] copy document row:", error.message);
          await supabase.storage.from(DOCUMENT_BUCKET).remove([to]);
        }
      }
    }

    const amount = formatEUR(ob.amount);
    const paidOn = match.date ? `${match.date.slice(8, 10)}/${match.date.slice(5, 7)}/${match.date.slice(0, 4)}` : "";
    outcomes.push(
      registered
        ? { label, result: "registered", detail: `${amount}, pagato il ${paidOn}${linked ? "" : " (file non collegato)"}` }
        : linked
          ? { label, result: "linked", detail: "già registrato: file collegato" }
          : { label, result: "skipped", detail: "file non collegato" },
    );
  }
  return outcomes;
}
