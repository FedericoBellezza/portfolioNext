# Assistente di studio (`/dashboard/assistant`)

Chat privata per interrogare slide, trascrizioni e riassunti dei corsi. Vive nella dashboard (login + `OWNER_EMAIL`), non è in sitemap e `robots.js` vieta `/dashboard/` e `/api/`.

## Come funziona

```
Browser ──upload──▶ Supabase Storage (assistant-files)
   │                         │
   └─▶ /api/assistant/ingest ┘  estrae testo → chunk → embedding OpenAI → assistant_chunks (pgvector + full-text)

Browser ─▶ /api/assistant/chat ─▶ ricerca ibrida (vettori + full-text, RRF) ─▶ prompt con le fonti [F1], [F2]…
                                   └─▶ webhook n8n ─▶ SSH ─▶ `claude -p` sul server (abbonamento, tool disattivati)
```

- Embedding: OpenAI `text-embedding-3-small` (unica API a pagamento, costo trascurabile).
- Generazione del testo: **Claude Code sul tuo server**, via workflow n8n "Assistente Studio (Claude Code)". Nessuna API Anthropic.
- Tutto passa dalla sessione dell'utente e dalla RLS di Supabase: **nessuna service-role key** nel portfolio.

## Messa in funzione

1. **Database**: esegui `supabase/migrations/0001_assistant.sql` nel SQL editor del progetto Supabase del portfolio (è rieseguibile). In *Authentication* disattiva le registrazioni pubbliche.
2. **Workflow n8n**: attiva (publish) "Assistente Studio (Claude Code)". Il webhook usa la credenziale *Header Auth account*: l'header è `X-Webhook-Secret`.
3. **Variabili d'ambiente** (`.env` locale e Vercel):

   | Variabile | Valore |
   |---|---|
   | `OPENAI_API_KEY` | chiave OpenAI (embedding e OCR di scansioni/immagini) |
   | `OWNER_EMAIL` | la tua email di login (nessun fallback: se manca le route rispondono 500) |
   | `N8N_ASSISTANT_URL` | `https://n8n.federicobellezza-dev.com/webhook/assistant-generate` |
   | `N8N_ASSISTANT_SECRET` | il valore della credenziale *Header Auth account* |
   | `ASSISTANT_TIMEOUT_MS` | opzionale, default 55000 |

4. Deploy, poi apri `/dashboard/assistant` (link "Assistente" nella barra).

## File supportati

| Tipo | Come viene letto | Citazione |
|---|---|---|
| PDF | testo per pagina; se è scansionato (≤ 20 pagine) OCR con OpenAI vision | `p.12` |
| PPTX | testo di ogni slide + note del relatore, nell'ordine della presentazione | `slide 3` |
| DOCX | markdown con i titoli | titolo di sezione |
| TXT / MD | sezioni dai titoli `#` | titolo di sezione |
| SRT / VTT | finestre da ~75 s | `04:35` |
| PNG / JPG / WEBP | trascrizione con OpenAI vision | — |

Massimo 50 MB per file. Audio e video non sono supportati (servono le trascrizioni).

## Modalità

Domanda, Riassunto, Quiz, Flashcard (esportabili per Anki), Piano di ripasso. Con un documento selezionato, riassunto/quiz/flashcard leggono il documento in ordine (opzionalmente un intervallo di pagine) invece di cercare i passaggi più simili.

## Configurazione e limiti

- **Modello ed effort** sono costanti nel nodo Code "Prepara Comando" del workflow (`MODEL`, `EFFORT`).
- **Dimensione del prompt**: il workflow rifiuta system + prompt oltre 85000 caratteri (un singolo argomento di riga di comando su Linux non supera ~128 KiB). La route limita il contesto di conseguenza.
- **Durata**: le route hanno `maxDuration = 60`. Se il tuo piano Vercel lo consente, alzalo in `chat/route.js` e `ingest/route.js` e imposta `ASSISTANT_TIMEOUT_MS`. Quiz e riassunti lunghi possono avvicinarsi al limite.
- **Niente streaming**: la risposta arriva intera a generazione finita.
- **Limiti dell'abbonamento** condivisi con gli altri workflow che usano Claude Code (bot Telegram, analisi lead delle 3 di notte).
- n8n salva prompt e risposte nelle esecuzioni: attiva la pulizia automatica dei dati di esecuzione.

## Cambiare il motore di generazione

Tutto il testo passa da `generate({ system, prompt })` in `src/lib/assistant/generate.js`. Per usare altro (per esempio le API Anthropic) basta riscrivere quella funzione: deve restituire `{ text, model, costUsd, durationMs }`.

## Test rapido del webhook

```bash
curl -s -X POST "$N8N_ASSISTANT_URL" \
  -H "X-Webhook-Secret: $N8N_ASSISTANT_SECRET" -H "Content-Type: application/json" \
  -d '{"system":"Rispondi in italiano.","prompt":"Dimmi ciao in una frase."}'
# → {"ok":true,"httpStatus":200,"text":"…","model":"claude-sonnet-5",…}
```
Senza il segreto n8n risponde 403.
