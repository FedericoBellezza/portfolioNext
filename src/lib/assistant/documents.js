import { DOCUMENT_COLUMNS, DOCUMENT_FOLDER_COLUMNS, DOCUMENT_VISUAL_COLUMNS } from "./constants";

/**
 * Elenco dei documenti per la pagina e per l'API. Le colonne delle migrazioni 0002 (figure) e
 * 0005 (cartelle) potrebbero non esistere ancora: si prova dalla versione completa a quella base,
 * così l'assistente continua a funzionare anche con il database indietro di una migrazione.
 */
export async function listDocuments(supabase) {
  const query = (columns) =>
    supabase.from("assistant_documents").select(columns).order("created_at", { ascending: false }).limit(500);

  const attempts = [
    [DOCUMENT_COLUMNS, DOCUMENT_VISUAL_COLUMNS, DOCUMENT_FOLDER_COLUMNS],
    [DOCUMENT_COLUMNS, DOCUMENT_VISUAL_COLUMNS],
    [DOCUMENT_COLUMNS, DOCUMENT_FOLDER_COLUMNS],
    [DOCUMENT_COLUMNS],
  ];
  let result;
  for (const columns of attempts) {
    result = await query(columns.join(", "));
    if (!result.error) break;
  }
  return result;
}

/**
 * Cartelle create dall'utente: { course, name }. Senza la migrazione 0005 la tabella non esiste
 * e l'elenco è vuoto (nessun errore: le cartelle sono un extra).
 */
export async function listFolders(supabase) {
  const { data, error } = await supabase
    .from("assistant_folders")
    .select("course, name")
    .order("name", { ascending: true })
    .limit(1000);
  return { data: error ? [] : data, available: !error };
}
