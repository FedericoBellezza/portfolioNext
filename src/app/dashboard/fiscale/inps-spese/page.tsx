import { redirect } from "next/navigation";

// "INPS e spese" now lives in the Tasse page (pagamenti registrati e spese).
export default function InpsSpesePage() {
  redirect("/dashboard/fiscale/scadenze");
}
