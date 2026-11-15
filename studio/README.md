# Studio reel Instagram

Reel 1080×1920 generati da codice con [Remotion](https://www.remotion.dev). Si parte da un copione JSON, si aggiungono voce AI (OpenAI TTS) e sottotitoli sincronizzati (Whisper), e si ottiene un MP4 pronto per Instagram.

Progetto separato dal sito: ha il suo `package.json` ed è escluso dalla build e dal lint di Next.

## Uso

```bash
cd studio
npm ci
npm run voce -- pilota-1      # voce + tempi → public/reel/pilota-1/reel.json
npm run render -- pilota-1    # → out/pilota-1.mp4
node scripts/anteprima.mjs pilota-1   # un PNG per scena, per controllare la grafica
npm run studio                # anteprima interattiva nel browser
```

`OPENAI_API_KEY` viene letta da `studio/.env` o, se manca, dal `.env` del sito. Opzioni della voce:
- `--voce=marin` (default; per confrontarle: `node scripts/campioni-voce.mjs marin cedar ash coral`);
- `--velocita=1.1`;
- `--forza` per rigenerare l'audio.

## Copione (`copioni/<id>.json`)

I campi sono definiti in `src/tipi.ts`. Ogni scena ha un `tipo` e una `voce` (la frase letta). La durata della scena segue la voce.

| tipo | cosa mostra | campi |
|---|---|---|
| `aggancio` | domanda grande, parola per parola | `titolo` (`*parole*` in accento), `sopratitolo?` |
| `chat` | conversazione WhatsApp o email in arrivo + bozza | `app`, `intestazione`, `messaggi[]` |
| `workflow` | 3–5 nodi che si accendono in sequenza | `titolo`, `nodi[]` (`icona`, `etichetta`, `dettaglio?`) |
| `confronto` | prima/dopo con contatore | `titolo`, `prima`, `dopo`, `nota` (obbligatoria: da dove viene il numero) |
| `schermata` | finestra di un'app con righe di stato, o screenshot reale | `titolo`, `app?`, `righe[]` oppure `immagine` |
| `cta` | chiusura con "Link in bio" | `titolo`, `sottotitolo`, `handle` |

Regole per i contenuti:
- **Niente risultati o clienti inventati.** I numeri sono "stima" o "esempio", e la `nota` lo dice.
- Durata 30–45 s: circa 90 parole di voce in tutto.

Colori e font della pagina stanno in `src/tema.ts`.
