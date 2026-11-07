# Fiscale — dashboard forfettario

Sezione privata `/dashboard/fiscale` (solo `OWNER_EMAIL`, come Assistente e Trader): regime forfettario, INPS Gestione Artigiani, fatture, scadenze F24, export per il commercialista.

## Struttura

| Percorso | Contenuto |
|---|---|
| `src/lib/fiscale/tax-config.ts` | Parametri di legge e INPS per anno, profilo di default, diciture in fattura |
| `src/lib/fiscale/tax-calculator.ts` | Motore puro: reddito (67%), imposta (5%), INPS fissi/eccedenza/riduzioni, acconti, calendario F24, accantonamento |
| `src/lib/fiscale/invoice-math.ts` | Totali fattura, bollo virtuale, netto stimato |
| `src/lib/fiscale/ledger.ts` | Registro incassi e pagamenti (CSV/JSON) |
| `src/lib/fiscale/data/` | Lettura dallo schema `fiscale`, dati demo, modello della dashboard |
| `src/app/dashboard/fiscale/` | Pagine e componenti (stile sotto `.fi`, vedi `fiscale.css`) |
| `src/app/api/fiscale/export` | Download registro (`protectedRoute`) |
| `supabase/migrations/0006_fiscale.sql`, `0007_…` | Schema `fiscale`, RLS per utente, fatture emesse immutabili, numerazione, ricevute F24 |

Tutti i calcoli sono in centesimi interi. Test: `npm test`.

## Setup

1. Migrazione `0006_fiscale.sql` (già applicata al progetto Supabase).
2. Supabase → Settings → Data API → **Exposed schemas**: aggiungere `fiscale`.
3. Creare il proprio profilo (finché manca, la dashboard mostra dati demo):

```sql
insert into fiscale.fiscal_profiles
  (user_id, first_name, last_name, vat_number, tax_code, address, postal_code, city, province, iban)
values
  ((select id from auth.users where email = '<OWNER_EMAIL>'),
   'Nome', 'Cognome', '<P.IVA 11 cifre>', '<CODICE FISCALE>', 'Via ...', '<CAP>', '<Comune>', '<PR>', '<IBAN>');
```

Riduzioni INPS: colonne `inps_reduction_35_active` e `inps_reduction_50_new_enrollment_active` (non cumulabili).

## Adempimenti da registrare

In cima alla panoramica e alle scadenze compare un banner con gli F24 scaduti senza pagamento registrato. Per ognuno si inseriscono data, importo effettivo e ricevuta (PDF/JPG/PNG, max 5 MB, bucket privato `fiscale-f24`). Il pagamento va in `inps_payments` o `tax_payments` (un solo versamento per adempimento) e da lì entra nei calcoli: le deduzioni INPS usano l'importo reale e la scadenza risulta pagata. Se un adempimento stimato non era dovuto si segna come tale (`obligation_dismissals`). Le ricevute si aprono da "INPS e spese" con link temporanei.

Il legame tra scadenze del calendario e righe del DB è in `src/lib/fiscale/obligations.ts` (testato).

Dalla pagina Scadenze si registrano anche le scadenze future già pagate. La ricevuta è facoltativa. L'**INAIL** (autoliquidazione del 16 febbraio, dall'anno dopo l'avvio) è nel calendario come le altre voci: importo stimato con l'ultimo premio pagato, "da verificare" finché non ce n'è uno. Non è dedotto dal reddito.

### Caricamento multiplo in Documenti

In Documenti si possono scegliere più file insieme: Claude legge ognuno (titolo, categoria, anno) e lo archivia senza conferma. Per un file di pagamento (categoria F24) legge anche il tipo di ricevuta, la data del versamento e le righe dell'F24. `src/lib/fiscale/f24-match.ts` (testato) abbina le righe alle scadenze: 1790/1791/1792 + anno, AF + periodo (trimestre), AP + periodo e mese del pagamento, 3850, 2521–2524, sezione INAIL di febbraio. `applyDocumentPayment` (`src/lib/fiscale/payment-write.ts`) registra il pagamento se la scadenza è libera e il file prova il pagamento (quietanza, F24 versato, attestazione), altrimenti collega solo il file. Un F24 con più righe viene copiato su ogni scadenza. Restano fuori, e sono elencati nel risultato: saldi a rate, interessi, ravvedimenti, Gestione Commercianti, rate INAIL successive.

## Fatture: emissione e invio (portale gratuito AdE)

1. **Nuova fattura** salva una bozza (totali ricalcolati sul server).
2. Dal dettaglio (`/dashboard/fiscale/fatture/[id]`) **Emetti**: `fiscale.issue_invoice` assegna il numero senza buchi, congela i dati del cliente e viene salvato l'XML FatturaPA (FPR12, RF19, N2.2, bollo virtuale). Prima dell'emissione l'XML viene generato "a vuoto" per scoprire dati mancanti senza consumare un numero. La data non può essere futura né precedente all'ultima fattura dell'anno.
3. **Scarica XML** (`/api/fiscale/fatture/[id]/xml`, nome `IT{P.IVA}_{progressivo}.xml`) e caricalo su Fatture e Corrispettivi → Trasmissione.
4. **Segna l'esito** (inviata, consegnata, mancata consegna, scartata).
5. Se **scartata**: correggi il cliente in anagrafica e **Rigenera XML**. Stesso numero e data, nuovo nome file (il tentativo è codificato nel progressivo); da reinviare entro 5 giorni. Solo in questo stato il DB permette di aggiornare i dati cliente congelati (migrazione `0008`).

Generatore: `src/lib/fiscale/fatturapa.ts` (testato). Le fatture alla PA (FPA12, firma digitale) non sono ancora supportate.

## Fatture passate e incassi

- **Importa fatture passate** (`/dashboard/fiscale/fatture/importa`): si caricano gli XML (anche `.p7m`) delle fatture già inviate con un altro servizio. Ognuna viene registrata come emessa e consegnata, con numero e data originali, senza nessun invio allo SdI. Il cliente viene riconosciuto per P.IVA/CF o creato. La numerazione dell'anno riparte dopo il numero più alto importato. Un file già importato viene ignorato. Solo TD01 non PA; lettore in `src/lib/fiscale/fatturapa-import.ts` (testato).
- **Incassi**: dal dettaglio di ogni fattura emessa si registrano data e importo incassato (anche parziali). La data d'incasso decide l'anno fiscale (principio di cassa).

## Da aggiornare ogni anno

- Parametri INPS in `tax-config.ts` (`INPS_ARTIGIANI`): 2026 da circolare INPS n. 14/2026. Gli anni mancanti usano l'ultimo noto con un avviso.
- Proroghe del 30 giugno in `INCOME_TAX_DEADLINE_OVERRIDES`: 2026 → 20 luglio (D.L. 89/2026, +0,80% fino al 20 agosto).
- Diritto camerale: importo indicativo.

## Prossimi passi

Modifica clienti, invio automatico via API (Openapi o Invoicetronic), nota di credito TD04, backup mensile dello schema via n8n.
