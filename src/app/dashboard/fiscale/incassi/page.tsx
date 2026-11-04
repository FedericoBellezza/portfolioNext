import { connection } from "next/server";
import { todayInRome } from "@/lib/fiscale/data/dashboard";
import { loadDataset } from "@/lib/fiscale/data/load";
import { DemoNotice, PageTitle, Panel } from "../components/ui";
import { CollectionsForm, type OpenInvoice } from "./collections-form";

export const metadata = { title: "Incassi | Fiscale" };

export default async function IncassiPage() {
  await connection();
  const today = todayInRome();
  const data = await loadDataset();
  const demo = data.source === "demo";

  const open: OpenInvoice[] = data.invoices
    .filter((i) => i.status === "issued" && i.issueDate && i.collected < i.total)
    .sort((a, b) => a.issueDate!.localeCompare(b.issueDate!))
    .map((i) => {
      // Suggest the due date (capped at today): to be checked against the bank statement.
      const due = i.dueDate && i.dueDate >= i.issueDate! ? i.dueDate : i.issueDate!;
      return {
        id: i.id,
        label: `${i.number}/${i.fiscalYear}`,
        clientName: i.clientName,
        issueDate: i.issueDate!,
        suggestedDate: due > today ? today : due,
        remaining: i.total - i.collected,
      };
    });

  return (
    <>
      <PageTitle
        title="Incassi"
        description="Il forfettario segue il principio di cassa: i ricavi e le tasse contano nell'anno in cui incassi, non in quello della fattura."
      />
      <DemoNotice show={demo} />
      <Panel
        title={open.length === 1 ? "1 fattura da incassare" : `${open.length} fatture da incassare`}
        description="Spunta quelle pagate e controlla la data con l'estratto conto: è proposta la scadenza della fattura."
      >
        {open.length === 0 ? (
          <p className="py-6 text-sm text-[var(--fi-ink-2)]">Tutte le fatture emesse risultano incassate.</p>
        ) : demo ? (
          <p className="py-6 text-sm text-[var(--fi-ink-2)]">In modalità demo la registrazione è disattivata.</p>
        ) : (
          <CollectionsForm invoices={open} today={today} />
        )}
      </Panel>
    </>
  );
}
