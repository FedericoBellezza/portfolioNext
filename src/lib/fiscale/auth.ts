import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions are public POST endpoints: check the owner here too,
 * not only in the middleware (same rule as protectedRoute in lib/server/api.js).
 */
export async function requireOwner() {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail) throw new Error("OWNER_EMAIL non configurata sul server");

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || (data.user.email ?? "").toLowerCase() !== ownerEmail) {
    throw new Error("Non autorizzato");
  }
  return data.user;
}
