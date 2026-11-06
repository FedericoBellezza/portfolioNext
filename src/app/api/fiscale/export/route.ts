import { fail, protectedRoute } from "@/lib/server/api";
import { loadDataset } from "@/lib/fiscale/data/load";
import { buildLedger, ledgerSummary, ledgerToCsv } from "@/lib/fiscale/ledger";
import { toFixed2 } from "@/lib/fiscale/money";

export const dynamic = "force-dynamic";

// GET /api/fiscale/export?year=2026&format=csv|json — owner e utenti della sezione Fiscale, ognuno con i suoi dati.
export const GET = protectedRoute(async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const year = Number(params.get("year"));
  const format = params.get("format") ?? "csv";
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fail(400, "Anno non valido");

  const data = await loadDataset();
  const rows = buildLedger(data, year);
  const filename = `registro-incassi-pagamenti-${year}`;
  const headers = { "Cache-Control": "no-store" };

  if (format === "json") {
    const body = {
      intestatario: data.owner,
      dati_dimostrativi: data.source === "demo",
      regime: "forfettario",
      ateco: data.profile.atecoCode,
      riepilogo_quadro_LM: ledgerSummary(data, year),
      movimenti: rows.map((r) => ({ ...r, amount: toFixed2(r.amount) })),
    };
    return new Response(JSON.stringify(body, null, 2), {
      headers: {
        ...headers,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    });
  }

  return new Response(ledgerToCsv(rows), {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}, { fiscale: true });
