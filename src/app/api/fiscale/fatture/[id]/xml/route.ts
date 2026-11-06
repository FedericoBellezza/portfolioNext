import { fail, protectedRoute } from "@/lib/server/api";
import { fiscaleDb } from "@/lib/fiscale/data/load";

export const dynamic = "force-dynamic";

// GET /api/fiscale/fatture/:id/xml — scarica l'XML FatturaPA salvato all'emissione (owner e utenti della sezione Fiscale, ognuno le sue).
export const GET = protectedRoute(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return fail(400, "Fattura non valida");

  const db = await fiscaleDb();
  const { data, error } = await db
    .from("invoices")
    .select("xml_payload, sdi_filename, status")
    .eq("id", id)
    .maybeSingle();
  if (error) return fail(500, "Errore interno del server");
  if (!data || data.status !== "issued" || !data.xml_payload) return fail(404, "XML non disponibile");

  const filename = String(data.sdi_filename ?? "fattura.xml").replace(/[^\w.-]/g, "");
  return new Response(String(data.xml_payload), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}, { fiscale: true });
