# Assistente di studio (`/dashboard/assistant`)

Chat privata per interrogare slide, trascrizioni e riassunti dei corsi. Vive nella dashboard (login + `OWNER_EMAIL`), non è in sitemap e `robots.js` vieta `/dashboard/` e `/api/`.

## Come funziona

```
Browser ──upload──▶ Supabase Storage (assistant-files)
   │                         │
   └─▶ /api/assistant/ingest ┘  estrae testo → chunk → embedding OpenAI → assistant_chunks (pgvector + full-text)

Browser ─▶ /api/assistant/visuals (a lotti, ripetuta) ─▶ pagine/immagini → vision OpenAI → passaggi "Figura N" indicizzati

Browser ─▶ /api/assistant/chat ─▶ ricerca ibrida (vettori + full-text, RRF) ─▶ prompt con le fonti [F1], [F2]…
                                   └─▶ webhook n8n ─▶ SSH ─▶ `claude -p` sul server (abbonamento, tool disattivati)
```

- Embedding e analisi delle figure: OpenAI (`text-embedding-3-small` e un modello vision). Sono le uniche API a pagamento.
- Generazione del testo: **Claude Code sul tuo server**, via workflow n8n "Assistente Studio (Claude Code)". Nessuna API Anthropic.
- Tutto passa dalla sessione dell'utente e dalla RLS di Supabase: **nessuna service-role key** nel portfolio.

## Messa in funzione

1. **Database**: esegui nel SQL editor del progetto Supabase del portfolio, in ordine, `supabase/migrations/0001_assistant.sql` e `supabase/migrations/0002_assistant_visuals.sql` (sono rieseguibili). In *Authentication* disattiva le registrazioni pubbliche. Senza la 0002 tutto funziona come prima, ma senza analisi delle figure.
2. **Workflow n8n**: attiva (publish) "Assistente Studio (Claude Code)". Il webhook usa una credenziale *Header Auth* con nome header `X-Webhook-Secret`.
3. **Variabili d'ambiente** (`.env` locale e Vercel):

   | Variabile | Valore |
   |---|---|
   | `OPENAI_API_KEY` | chiave OpenAI (embedding, OCR di scansioni/immagini, analisi delle figure) |
   | `OWNER_EMAIL` | la tua email di login (nessun fallback: se manca le route rispondono 500) |
   | `N8N_ASSISTANT_URL` | `https://n8n.federicobellezza-dev.com/webhook/assistant-generate` |
   | `N8N_ASSISTANT_SECRET` | il valore (campo *Value*) della credenziale *Header Auth* del webhook |
   | `ASSISTANT_TIMEOUT_MS` | opzionale, default 55000 |
   | `ASSISTANT_VISION_MODEL` | opzionale, default `gpt-4o-mini`: modello per OCR e figure |

4. Deploy, poi apri `/dashboard/assistant` (link "Assistente" nella barra).

## File supportati

| Tipo | Come viene letto | Citazione |
|---|---|---|
| PDF | testo per pagina; se è scansionato (≤ 20 pagine) OCR con OpenAI vision; grafici e schemi: vedi sotto | `p.12` |
| PPTX | testo di ogni slide + note del relatore, nell'ordine della presentazione; grafici, SmartArt e frecce letti dal file; immagini: vedi sotto | `slide 3` |
| DOCX | markdown con i titoli | titolo di sezione |
| TXT / MD | sezioni dai titoli `#` | titolo di sezione |
| SRT / VTT | finestre da ~75 s | `04:35` |
| PNG / JPG / WEBP | trascrizione con OpenAI vision | — |

Massimo 50 MB per file. Audio e video non sono supportati (servono le trascrizioni).

## Figure, grafici e schemi

La chat (Claude Code sul server) non può ricevere immagini, quindi le figure vengono "tradotte in testo" **al caricamento** e indicizzate come qualunque altro passaggio. Compaiono nelle risposte come fonti con la dicitura *figura* (per esempio `p.12 · figura`) e si citano come le altre.

- **PPTX, senza costi**: grafici nativi (tipo, titolo, assi, serie e valori esatti), SmartArt (voci) e frecce tra le forme (`Ordine → Verifica`) sono dati dentro il file: vengono letti direttamente e aggiunti al testo della slide.
- **PDF**: le pagine "da slide" (meno di 150 parole) e quelle con un'immagine incorporata vengono rese in immagine (900 px) e descritte da un modello vision. Serve anche per i grafici vettoriali, che nel PDF non sono immagini. Le pagine di solo testo vengono saltate.
- **Immagini incorporate nei PPTX**: descritte dal modello vision. Icone, loghi e immagini ripetute su più slide vengono scartati.
- **Come gira**: dopo l'upload il testo è subito utilizzabile; le figure si analizzano a lotti da 8 mentre la pagina resta aperta ("Figure: 24/60" accanto al documento). Se chiudi la pagina o c'è un errore, "Riprendi analisi figure" continua da dove era arrivata, senza duplicare nulla. L'opzione "Analizza anche grafici, schemi e immagini" nel pannello di upload si può spegnere.
- **Costo**: un'immagine a 900 px pesa circa 14.000 token di input (misurato; a 1100 px sarebbero 37.000). Con `gpt-4o-mini` sono pochi decimi di centesimo a pagina e pochi centesimi per un deck: verifica il listino OpenAI aggiornato.
- **Affidabilità**: i valori letti dai grafici sono quelli giusti nelle prove fatte, ma il modello a volte *deduce* dettagli che non ci sono (per esempio un'unità di misura). Per questo il prompt dell'assistente avverte che i valori letti da un grafico vengono da una descrizione automatica. Per grafici complessi imposta un modello più capace con `ASSISTANT_VISION_MODEL`.

Limiti noti: un PDF di testo lungo con figure *vettoriali* ma senza immagini incorporate non le segnala (si analizzano solo le pagine corte o con immagini); le immagini EMF/WMF/SVG nei PPTX sono ignorate; le slide native senza connettori agganciati non hanno la struttura delle frecce; al massimo 150 elementi per documento.

## Modalità

Domanda, Riassunto, Quiz, Flashcard (esportabili per Anki), Piano di ripasso. Con un documento selezionato, riassunto/quiz/flashcard leggono il documento in ordine (opzionalmente un intervallo di pagine) invece di cercare i passaggi più simili.

## Configurazione e limiti

- **Modello ed effort** sono costanti nel nodo Code "Prepara Comando" del workflow (`MODEL`, `EFFORT`).
- **Dimensione del prompt**: il workflow rifiuta system + prompt oltre 85000 caratteri (un singolo argomento di riga di comando su Linux non supera ~128 KiB). La route limita il contesto di conseguenza.
- **Durata**: le route hanno `maxDuration = 60`. Se il tuo piano Vercel lo consente, alzalo in `chat/route.js` e `ingest/route.js` e imposta `ASSISTANT_TIMEOUT_MS` (`visuals/route.js` elabora lotti da 8 elementi, 4-12 secondi nelle prove: di solito non serve). Quiz e riassunti lunghi possono avvicinarsi al limite.
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
