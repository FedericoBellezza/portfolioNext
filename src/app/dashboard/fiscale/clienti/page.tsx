import { connection } from "next/server";
import { loadDataset } from "@/lib/fiscale/data/load";
import { ConfirmSubmit } from "../components/form-buttons";
import { DemoNotice, PageTitle, Panel } from "../components/ui";
import { archiveClientAction } from "./actions";
import { ClientForm } from "./client-form";

export const metadata = { title: "Clienti | Fiscale" };

export default async function ClientiPage() {
  await connection();
  const data = await loadDataset();
  const demo = data.source === "demo";

  return (
    <>
      <PageTitle title="Clienti" description="Anagrafica usata nelle fatture elettroniche (cessionario/committente)." />
      <DemoNotice show={demo} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Panel title="Nuovo cliente" className="xl:col-span-3">
          <ClientForm demo={demo} />
        </Panel>

        <Panel
          title={data.clients.length === 1 ? "1 cliente" : `${data.clients.length} clienti`}
          description="I clienti archiviati non compaiono nelle nuove fatture; le fatture già emesse restano invariate."
          className="xl:col-span-2"
        >
          {data.clients.length === 0 ? (
            <p className="py-6 text-sm text-[var(--fi-ink-2)]">Nessun cliente. Aggiungi il primo con il form.</p>
          ) : (
            <ul className="divide-y divide-[var(--fi-rule)]">
              {data.clients.map((c) => (
                <li key={c.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-xs text-[var(--fi-muted)]">
                      {c.vatNumber ? `P.IVA ${c.vatNumber}` : `CF ${c.taxCode}`} · {c.city}
                    </p>
                    <p className="truncate text-xs text-[var(--fi-muted)]">
                      SDI {c.sdiCode}
                      {c.pec ? ` · PEC ${c.pec}` : ""}
                    </p>
                  </div>
                  {!demo && (
                    <form action={archiveClientAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmSubmit
                        question="Archiviare il cliente?"
                        confirmLabel="Sì, archivia"
                        pendingLabel="Archiviazione…"
                        className="text-xs text-[var(--fi-ink-2)] underline hover:text-[var(--fi-critical)]"
                      >
                        Archivia
                      </ConfirmSubmit>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
