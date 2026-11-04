import { connection } from "next/server";
import { todayInRome } from "@/lib/fiscale/data/dashboard";
import { loadDataset } from "@/lib/fiscale/data/load";
import { DemoNotice, PageTitle } from "../../components/ui";
import { InvoiceForm } from "./invoice-form";

export const metadata = { title: "Nuova fattura | Fiscale" };

export default async function NuovaFatturaPage() {
  await connection();
  const data = await loadDataset();
  const demo = data.source === "demo";
  return (
    <>
      <PageTitle
        title="Nuova fattura"
        description="Il numero viene assegnato all'emissione. Clausola forfettario e bollo sono automatici."
      />
      <DemoNotice show={demo} />
      <InvoiceForm clients={data.clients} profile={data.profile} today={todayInRome()} demo={demo} />
    </>
  );
}
