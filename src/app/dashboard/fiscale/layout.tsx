import { Suspense } from "react";
import { accessOf } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { NavProgress } from "./components/nav-progress";
import { SubNav } from "./components/sub-nav";
import "./fiscale.css";

export const metadata = {
  title: "Fiscale | Dashboard",
  description: "Regime forfettario, INPS Artigiani, fatture e scadenze F24",
  robots: { index: false, follow: false },
};

// Autenticazione: middleware + layout di /dashboard (owner e utenti della sola sezione Fiscale,
// vedi lib/auth/access.js). Dati nello schema `fiscale` di Supabase, protetti da RLS per utente.
// The section breaks out of the dashboard container to read as its own app:
// full width under the dashboard nav, when there is one (the body already hides horizontal overflow).
export default async function FiscaleLayout({ children }: { children: React.ReactNode }) {
  // Users of the fiscal section only have no dashboard top bar: the rail shows their account and logout.
  const { data } = await (await createClient()).auth.getUser();
  const fiscaleOnly = accessOf(data.user?.email) === "fiscale";

  return (
    <>
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <div className="fi relative left-1/2 -my-8 w-screen -translate-x-1/2 bg-[var(--fi-ground)]">
        <div className="flex min-h-[calc(100vh_-_var(--dash-nav-h,61px))] flex-col lg:flex-row">
          <SubNav email={fiscaleOnly ? (data.user?.email ?? null) : null} />
          <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
            <div className="mx-auto max-w-[1180px]">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
