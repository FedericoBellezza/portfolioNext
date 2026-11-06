import { connection } from "next/server";
import { fiscaleDb } from "@/lib/fiscale/data/load";
import { AdvisorChat } from "./advisor-chat";

export const metadata = { title: "Chiedi | Fiscale" };

/** AI accountant: questions on the owner's data, answered by Claude Code via n8n (/api/fiscale/chat). */
export default async function ChiediPage() {
  await connection();
  const db = await fiscaleDb();
  const { data: profile } = await db.from("fiscal_profiles").select("user_id").maybeSingle();
  return <AdvisorChat demo={!profile} />;
}
