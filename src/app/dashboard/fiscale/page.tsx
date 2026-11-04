import { connection } from "next/server";
import { todayInRome } from "@/lib/fiscale/data/dashboard";
import { loadDataset } from "@/lib/fiscale/data/load";
import { Overview } from "./components/overview";

export default async function FiscalePage() {
  await connection(); // "oggi" va calcolato a ogni richiesta
  const data = await loadDataset();
  return <Overview data={data} asOf={todayInRome()} />;
}
