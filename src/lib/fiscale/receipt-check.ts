/**
 * Check of payment files with Claude Code on the owner's server (n8n webhook →
 * `claude -p`, subscription, no API credit): from the text of a PDF it tells
 * what the file is, whether it proves the payment, and whether it belongs to
 * the payment it is linked to. Prompt building and reply parsing live here so
 * they can be tested; the call itself is in receipt-check-actions.ts.
 */

import { z } from "zod";
import type { FileCheck } from "./data/types";
import { CHECK_KINDS } from "./receipts";

export const CHECK_MODEL = "claude-haiku-5-5";
export const CHECK_EFFORT = "low";
/** Files per call: keeps the prompt well under the 85,000 characters the webhook accepts. */
export const CHECK_BATCH = 6;
const MAX_TEXT_CHARS = 6000;

export const CHECK_SYSTEM = `Classifichi documenti di pagamento fiscali italiani (F24, imposta di bollo delle fatture elettroniche) di un lavoratore autonomo. Ricevi il testo estratto da uno o più PDF; per ciascuno è indicato il pagamento registrato a cui l'utente lo ha collegato. Rispondi SOLO con un oggetto JSON, senza testo prima o dopo.

Tipi possibili (definitivo = prova che il pagamento è avvenuto):
- "quietanza_banca": quietanza della banca o di Poste per un F24 addebitato sul conto ("quietanza di versamento", estremi dell'addebito). Definitivo.
- "f24_versato": copia di un F24 già pagato, scaricata dal Cassetto fiscale o dalla banca: il modulo F24 con gli "estremi del versamento" compilati (data del versamento, codici ABI/CAB della banca). Definitivo.
- "attestazione_pagamento": attestazione di pagamento dell'imposta di bollo (Fatture e Corrispettivi) con pagamento eseguito. Definitivo.
- "prenotazione": attestazione di prenotazione del pagamento del bollo, addebito prenotato o in corso. Provvisorio.
- "ricevuta_invio": ricevuta dell'Agenzia delle Entrate che un F24 inviato in via telematica è stato acquisito (protocollo, "correttamente acquisita", esito dell'elaborazione disponibile dopo). Provvisorio.
- "modello_f24": il solo modulo F24 compilato o precompilato, senza estremi del versamento compilati dalla banca. Anche un F24 con un "Protocollo" telematico ma senza data e ABI/CAB del versamento è modello_f24. Provvisorio.
- "altro": nessuno dei precedenti (definitivo false).
Nel dubbio tra definitivo e provvisorio scegli provvisorio.

Formato:
{"documenti":[{"n":1,"tipo":"...","definitivo":true,"data":"AAAA-MM-GG o null","importo":12.34,"importo_coerente":true,"nota":null}]}
- data: data del versamento o dell'addebito (per prenotazione e ricevuta_invio la data di addebito/versamento prevista).
- importo: in euro, l'importo del pagamento collegato se lo trovi nel documento, altrimenti il saldo finale; null se non c'è.
- importo_coerente: true se nel documento c'è l'importo del pagamento collegato (una riga del tributo, la somma delle righe o il saldo); false solo se il documento riguarda chiaramente un altro pagamento (altro tributo, altro periodo, altro importo); null se non si capisce. Un F24 può contenere più tributi. Se il pagamento è compensato con un credito il saldo è 0: è normale, conta la riga del tributo; se il documento non riporta le righe (es. ricevuta di invio con importo 0,00) usa null.
- nota: null quasi sempre. Scrivi una frase breve in italiano solo se l'utente deve fare qualcosa (es. il documento sembra di un altro pagamento). Non spiegare la classificazione né la compensazione.`;

export interface CheckInput {
  /** Payment as the owner recorded it, e.g. "Bollo 2° trimestre 2026, 4,00 €, data 2026-11-05". */
  payment: string;
  fileName: string;
  text: string;
}

/** Tidies the text of a PDF and keeps the start (receipts are short). */
export function receiptText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

export function buildCheckPrompt(files: CheckInput[]): string {
  return files
    .map(
      (f, i) =>
        `### Documento ${i + 1}\nPagamento collegato: ${f.payment}\nNome file: ${f.fileName}\nTesto estratto:\n<<<\n${f.text.replaceAll(">>>", "> > >")}\n>>>`,
    )
    .join("\n\n");
}

const Reply = z.object({
  documenti: z.array(
    z.object({
      n: z.coerce.number().int(),
      tipo: z.string(),
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().catch(null),
      importo: z.coerce.number().nullable().catch(null),
      importo_coerente: z.boolean().nullable().catch(null),
      nota: z.string().max(400).nullable().catch(null),
    }),
  ),
});

/**
 * Results in input order; null for a file Claude did not answer about. Whether
 * a file is final follows from its kind, so the two can never disagree.
 */
export function parseCheckReply(reply: string, count: number, checkedAt: string): (FileCheck | null)[] {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  let parsed: z.infer<typeof Reply> | null = null;
  if (start >= 0 && end > start) {
    try {
      const r = Reply.safeParse(JSON.parse(reply.slice(start, end + 1)));
      if (r.success) parsed = r.data;
    } catch {
      parsed = null;
    }
  }
  return Array.from({ length: count }, (_, i) => {
    const d = parsed?.documenti.find((x) => x.n === i + 1);
    if (!d) return null;
    const kind = d.tipo in CHECK_KINDS ? d.tipo : "altro";
    return {
      status: "ok" as const,
      kind,
      final: CHECK_KINDS[kind].final,
      date: d.data,
      amount: d.importo,
      matches: d.importo_coerente,
      // Notes are only kept for a file that seems to be of another payment:
      // otherwise the model tends to explain the obvious (e.g. compensation).
      note: d.importo_coerente === false ? d.nota?.trim() || null : null,
      checkedAt,
    };
  });
}
