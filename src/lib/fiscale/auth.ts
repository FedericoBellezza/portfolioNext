import "server-only";
import { accessOf } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions are public POST endpoints: check the user here too, not only
 * in the middleware (same rule as protectedRoute in lib/server/api.js). The
 * owner and the fiscale users get in; each one only ever sees their own rows (RLS).
 */
export async function requireFiscaleUser() {
  if (!process.env.OWNER_EMAIL?.trim()) throw new Error("OWNER_EMAIL non configurata sul server");

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || !accessOf(data.user.email)) throw new Error("Non autorizzato");
  return data.user;
}
