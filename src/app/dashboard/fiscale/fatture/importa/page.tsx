import { connection } from "next/server";
import Link from "next/link";
import { fiscaleDb } from "@/lib/fiscale/data/load";
import { btn, DemoNotice, PageTitle, Panel } from "../../components/ui";
import { ImportForm } from "./import-form";

export const metadata = { title: "Importa fatture | Fiscale" };

export default async function ImportaPage() {
  await connection();
  const db = await fiscaleDb();
  const { data: profile } = await db.from("fiscal_profiles").select("user_id").maybeSingle();
  const demo = !profile;

  return (
    <>
      <PageTitle
        title="Importa fatture già emesse"
        description="Per le fatture inviate prima di usare questa dashboard: vengono registrate, non reinviate."
        action={
          <Link href="/dashboard/fiscale/fatture" className={btn.outline}>
            ← Fatture
          </Link>
        }
      />
      <DemoNotice show={demo} />
      <div className="grid gap-6 xl:grid-cols-5">
        <Panel title="Carica i file" className="xl:col-span-3">
          <ImportForm demo={demo} />
        </Panel>
        <Panel title="Come funziona" className="xl:col-span-2">
          <ol className="list-decimal space-y-2.5 pl-4 text-sm text-[var(--fi-ink-2)]">
            <li>
              Scarica gli XML delle tue fatture dal servizio che usavi, oppure da Fatture e Corrispettivi →
              Consultazione → Fatture emesse.
            </li>
            <li>
              Caricali qui. Ogni fattura viene salvata con il suo <b className="text-[var(--fi-ink)]">numero e data
              originali</b>, come già consegnata: nessun invio allo SdI.
            </li>
            <li>
              Il cliente viene riconosciuto dalla P.IVA o dal codice fiscale; se non c&apos;è, viene creato.
            </li>
            <li>
              Le nuove fatture continuano la numerazione dopo il numero più alto importato per ogni anno.
            </li>
            <li>
              Poi apri ogni fattura e <b className="text-[var(--fi-ink)]">registra l&apos;incasso</b>: le tasse si
              calcolano sulla data in cui hai incassato, non su quella di emissione.
            </li>
          </ol>
          <p className="mt-4 text-xs text-[var(--fi-muted)]">
            Per ora si importano solo fatture (TD01) non indirizzate alla PA. Se lo stesso file viene caricato due volte,
            la seconda viene ignorata.
          </p>
        </Panel>
      </div>
    </>
  );
}
