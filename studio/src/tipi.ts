/**
 * Schema di un reel. Lo Sceneggiatore (agente) può usare solo questi tipi di
 * scena: il catalogo è descritto anche nella skill `scene-remotion`, quindi
 * se aggiungi un tipo qui aggiornalo anche lì.
 *
 * Il copione (copioni/<id>.json) contiene solo testo. scripts/voce.mjs aggiunge
 * a ogni scena `audio`, `parole` e `durata` e scrive public/reel/<id>/reel.json,
 * che è quello che la composizione legge.
 */

export type NomeIcona =
  | "email"
  | "form"
  | "ai"
  | "db"
  | "doc"
  | "whatsapp"
  | "calendario"
  | "check"
  | "excel"
  | "campanella"
  | "filtro"
  | "lucchetto"
  | "utente"
  | "invio"
  | "cerca";

/** Una parola della voce, con tempi in secondi dall'inizio della scena. */
export type Parola = { testo: string; inizio: number; fine: number };

type Base = {
  /** Frase letta dalla voce durante la scena. */
  voce: string;
  /** Aggiunti da scripts/voce.mjs. */
  audio?: string;
  parole?: Parola[];
  durata?: number;
};

export type Misura = { valore: number; unita: string; etichetta?: string };

export type ScenaAggancio = Base & {
  tipo: "aggancio";
  /** Le parole tra *asterischi* prendono il colore d'accento. */
  titolo: string;
  sopratitolo?: string;
};

export type Messaggio = {
  da: "loro" | "noi";
  testo: string;
  ora?: string;
  /** Per app "email": oggetto della mail. */
  etichetta?: string;
};

export type ScenaChat = Base & {
  tipo: "chat";
  app: "whatsapp" | "email";
  /** Nome del contatto (whatsapp) o mittente (email). */
  intestazione: string;
  messaggi: Messaggio[];
};

export type Nodo = { etichetta: string; dettaglio?: string; icona: NomeIcona };

export type ScenaWorkflow = Base & {
  tipo: "workflow";
  titolo: string;
  /** Da 3 a 5 nodi. */
  nodi: Nodo[];
};

export type ScenaConfronto = Base & {
  tipo: "confronto";
  titolo: string;
  prima: Misura;
  dopo: Misura;
  /** Obbligatoria: dice da dove viene il numero (es. "Stima su ..."). */
  nota: string;
};

export type Riga = {
  testo: string;
  dettaglio?: string;
  stato: "ok" | "attesa" | "nuovo";
  /** Testo dell'etichetta a destra, se quello dello stato non va bene (es. "Attivo"). */
  etichetta?: string;
};

export type ScenaSchermata = Base & {
  tipo: "schermata";
  titolo: string;
  /** Nome mostrato nella barra della finestra. */
  app?: string;
  righe?: Riga[];
  /** Screenshot di un progetto reale in public/progetti (al posto delle righe). */
  immagine?: string;
};

export type ScenaCta = Base & {
  tipo: "cta";
  titolo: string;
  sottotitolo: string;
  handle: string;
};

export type Scena =
  | ScenaAggancio
  | ScenaChat
  | ScenaWorkflow
  | ScenaConfronto
  | ScenaSchermata
  | ScenaCta;

export type Reel = {
  id: string;
  titolo: string;
  pilastro: "settore" | "numeri" | "miti" | "progetti";
  didascalia: string;
  hashtag: string[];
  musica?: { src: string; volume?: number };
  scene: Scena[];
};

export type PropsReel = { id: string; reel?: Reel };
