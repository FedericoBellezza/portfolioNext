import { connection } from "next/server";
import { fiscaleDb } from "@/lib/fiscale/data/load";
import { profileFormValues } from "@/lib/fiscale/profile";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "../components/ui";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Profilo | Fiscale" };

export default async function ProfiloPage() {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const db = await fiscaleDb();
  const { data: row } = await db.from("fiscal_profiles").select("*").maybeSingle();

  return (
    <>
      <PageTitle
        title={row ? "Profilo fiscale" : "Crea il tuo profilo fiscale"}
        description={
          row
            ? "I dati della tua partita IVA: intestazione delle fatture e impostazioni usate per imposta, contributi e scadenze."
            : "Finché non lo crei la dashboard mostra dati dimostrativi. Bastano pochi minuti: li trovi nella visura camerale e nel certificato di attribuzione della partita IVA."
        }
      />
      <div className="max-w-[860px]">
        <ProfileForm initial={profileFormValues(row, auth.user?.email ?? null)} isNew={!row} />
      </div>
    </>
  );
}
