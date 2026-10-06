import { DOCUMENT_COLUMNS, DOCUMENT_VISUAL_COLUMNS } from "./constants";

/**
 * Elenco dei documenti per la pagina e per l'API. Se la migrazione 0002 non è ancora stata applicata
 * le colonne dell'analisi figure non esistono: si ripiega sull'elenco base, così l'assistente
 * continua a funzionare (senza la parte sulle figure).
 */
export async function listDocuments(supabase) {
  const query = (columns) =>
    supabase.from("assistant_documents").select(columns).order("created_at", { ascending: false }).limit(500);

  const full = await query(`${DOCUMENT_COLUMNS}, ${DOCUMENT_VISUAL_COLUMNS}`);
  return full.error ? query(DOCUMENT_COLUMNS) : full;
}
