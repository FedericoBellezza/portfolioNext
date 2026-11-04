import { fraunces } from "../components/fonts";
import { SubNav } from "./components/sub-nav";
import "./fiscale.css";

export const metadata = {
  title: "Fiscale | Dashboard",
  description: "Regime forfettario, INPS Artigiani, fatture e scadenze F24",
  robots: { index: false, follow: false },
};

// Autenticazione: middleware + layout di /dashboard (solo OWNER_EMAIL).
// Dati nello schema `fiscale` di Supabase, protetti da RLS per utente.
export default function FiscaleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`fi ${fraunces.variable}`}>
      <SubNav />
      {children}
    </div>
  );
}
