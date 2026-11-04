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
| `supabase/migrations/0006_fiscale.sql` | Schema `fiscale`, RLS per utente, fatture emesse immutabili, numerazione |

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

## Da aggiornare ogni anno

- Parametri INPS in `tax-config.ts`: il 2026 usa i valori 2025 (`verified: false`, la dashboard mostra un avviso) finché non si inserisce la circolare INPS 2026.
- Diritto camerale: importo indicativo.

## Prossimi passi

Anagrafica clienti, registrazione incassi e F24, emissione e XML FatturaPA, invio via Invoicetronic, backup mensile dello schema via n8n.
