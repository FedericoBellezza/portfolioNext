import { connection } from "next/server";
import { todayInRome } from "@/lib/fiscale/data/dashboard";
import { loadGuideMedia } from "@/lib/fiscale/data/guide-media";
import { loadDataset } from "@/lib/fiscale/data/load";
import { Overview } from "./components/overview";

export default async function FiscalePage() {
  await connection(); // "oggi" va calcolato a ogni richiesta
  const data = await loadDataset();
  const media = data.source === "demo" ? {} : await loadGuideMedia();
  return <Overview data={data} asOf={todayInRome()} media={media} />;
}
