import { connection } from "next/server";
import Link from "next/link";
import { loadDataset } from "@/lib/fiscale/data/load";
import type { InvoiceRow, SdiStatus } from "@/lib/fiscale/data/types";
import { date, eur } from "../components/format";
import { Badge, btn, DemoNotice, PageTitle, Panel } from "../components/ui";

export const metadata = { title: "Fatture | Fiscale" };

type Tone = "neutral" | "outline" | "critical" | "good";
const SDI: Record<SdiStatus, { label: string; tone: Tone }> = {
  not_sent: { label: "Da inviare", tone: "outline" },
  queued: { label: "In coda", tone: "outline" },
  sent: { label: "Inviata", tone: "neutral" },
  delivered: { label: "Consegnata", tone: "good" },
  not_delivered: { label: "Mancata consegna", tone: "neutral" },
  rejected: { label: "Scartata", tone: "critical" },
  accepted: { label: "Accettata", tone: "good" },
  refused: { label: "Rifiutata", tone: "critical" },
  expired: { label: "Decorrenza termini", tone: "neutral" },
};

function Payment({ invoice }: { invoice: InvoiceRow }) {
  if (invoice.status === "draft") return <span className="text-[var(--fi-muted)]">—</span>;
  if (invoice.collected >= invoice.total)
    return <span className="text-[var(--fi-good-text)]">Incassata {date(invoice.lastCollectedAt)}</span>;
  if (invoice.collected > 0)
    return <span className="text-[var(--fi-warning-text)]">Parziale {eur(invoice.collected)}</span>;
  return <span className="text-[var(--fi-ink-2)]">Scade {date(invoice.dueDate)}</span>;
}

const th = "px-3 py-2.5 text-left font-medium text-[var(--fi-muted)] text-xs";
const td = "px-3 py-3 align-middle";

export default async function FatturePage() {
  await connection();
  const data = await loadDataset();
  return (
    <>
      <PageTitle
        title="Fatture"
        description="FatturaPA · RF19 · Natura N2.2 · bollo virtuale oltre 77,47 €"
        action={
          <div className="flex gap-2">
            <Link href="/dashboard/fiscale/fatture/importa" className={btn.outline}>
              Importa fatture passate
            </Link>
            <Link href="/dashboard/fiscale/fatture/nuova" className={btn.primary}>
              Nuova fattura
            </Link>
          </div>
        }
      />
      <DemoNotice show={data.source === "demo"} />
      <Panel title={`${data.invoices.length} documenti`} description={`${data.clients.length} clienti in anagrafica`}>
        {data.invoices.length === 0 ? (
          <p className="py-6 text-sm text-[var(--fi-ink-2)]">Nessuna fattura.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-[var(--fi-rule)]">
                <tr>
                  <th className={`${th} pl-5`}>Numero</th>
                  <th className={th}>Data</th>
                  <th className={th}>Cliente</th>
                  <th className={`${th} text-right`}>Imponibile</th>
                  <th className={`${th} text-right`}>Totale</th>
                  <th className={th}>SdI</th>
                  <th className={`${th} pr-5`}>Incasso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--fi-rule)]">
                {data.invoices.map((i) => (
                  <tr key={i.id} className="hover:bg-white">
                    <td className={`${td} fi-num pl-5 font-medium`}>
                      <Link href={`/dashboard/fiscale/fatture/${i.id}`} className="hover:text-[var(--fi-action)] hover:underline">
                        {i.status === "draft" ? <Badge tone="outline">Bozza</Badge> : `${i.number}/${i.fiscalYear}`}
                      </Link>
                    </td>
                    <td className={`${td} fi-num`}>{date(i.issueDate)}</td>
                    <td className={td}>{i.clientName}</td>
                    <td className={`${td} fi-num text-right`}>{eur(i.taxableAmount)}</td>
                    <td className={`${td} fi-num text-right`}>{eur(i.total)}</td>
                    <td className={td}>
                      <Badge tone={SDI[i.sdiStatus].tone}>{SDI[i.sdiStatus].label}</Badge>
                    </td>
                    <td className={`${td} pr-5`}>
                      <Payment invoice={i} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
