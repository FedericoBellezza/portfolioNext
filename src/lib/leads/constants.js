// Costanti condivise tra server (validazione) e client (UI) per la tabella public.leads.
// Nessun segreto qui: questo file finisce anche nel bundle del browser.

/**
 * @typedef {Object} Lead
 * @property {string} id
 * @property {string} instagram_handle
 * @property {string} instagram_url        generata dal database, mai scritta
 * @property {string|null} nome
 * @property {string|null} bio
 * @property {string|null} settore
 * @property {string|null} citta
 * @property {number|null} followers
 * @property {string|null} ultimo_post      date (YYYY-MM-DD)
 * @property {string|null} sito_url
 * @property {boolean|null} ha_sito
 * @property {string|null} sito_note
 * @property {string|null} email_pubblica
 * @property {string|null} telefono
 * @property {string[]|null} punti_carenti
 * @property {string[]|null} tag
 * @property {number|null} punteggio        1-10
 * @property {string|null} messaggio_proposto
 * @property {string} stato
 * @property {string|null} canale_invio
 * @property {string|null} messaggio_inviato_il  timestamptz
 * @property {string|null} risposto_il           timestamptz
 * @property {string|null} esito
 * @property {string|null} data_followup         date (YYYY-MM-DD)
 * @property {string|null} note
 * @property {string|null} analizzato_il
 * @property {string} created_at
 * @property {string} updated_at
 */

export const STATI = [
  "nuovo",
  "da_rivedere",
  "contattato",
  "risposto",
  "scartato",
  "errore_analisi",
];
export const STATO_LABEL = {
  nuovo: "Nuovo",
  da_rivedere: "Da rivedere",
  contattato: "Contattato",
  risposto: "Risposto",
  scartato: "Scartato",
  errore_analisi: "Errore analisi",
};

export const ESITI = [
  "nessuna_risposta",
  "interessato",
  "non_interessato",
  "call_fissata",
  "cliente",
  "non_raggiungibile",
];
export const ESITO_LABEL = {
  nessuna_risposta: "Nessuna risposta",
  interessato: "Interessato",
  non_interessato: "Non interessato",
  call_fissata: "Call fissata",
  cliente: "Cliente",
  non_raggiungibile: "Non raggiungibile",
};

export const CANALI = ["instagram_dm", "email", "whatsapp", "telefono"];
export const CANALE_LABEL = {
  instagram_dm: "DM Instagram",
  email: "Email",
  whatsapp: "WhatsApp",
  telefono: "Telefono",
};

export const TAGS = [
  "senza_sito",
  "sito_datato",
  "non_mobile_friendly",
  "no_prenotazione_online",
  "no_contatto_rapido",
  "poche_automazioni",
  "sito_non_raggiungibile",
];
export const TAG_LABEL = {
  senza_sito: "Senza sito",
  sito_datato: "Sito datato",
  non_mobile_friendly: "Non mobile friendly",
  no_prenotazione_online: "No prenotazione online",
  no_contatto_rapido: "No contatto rapido",
  poche_automazioni: "Poche automazioni",
  sito_non_raggiungibile: "Sito non raggiungibile",
};

export const SORT_FIELDS = ["punteggio", "created_at", "messaggio_inviato_il"];
export const SORT_LABEL = {
  punteggio: "Punteggio",
  created_at: "Data di creazione",
  messaggio_inviato_il: "Data di invio",
};

export const PAGE_SIZE = 50;
export const MAX_URLS_PER_REQUEST = 50;
