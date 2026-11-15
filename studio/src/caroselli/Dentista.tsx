import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadSans } from "@remotion/google-fonts/Geist";

/**
 * Carosello d'esempio "Cosa automatizzerei in uno studio dentistico".
 * Un frame = una slide (1080×1350, formato 4:5 di Instagram).
 * Stile editoriale chiaro, volutamente diverso dai reel scuri.
 */

const serif = loadSerif("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
loadSerif("italic", { weights: ["400"], subsets: ["latin"] });
const sans = loadSans("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;

const C = {
  carta: "#F3EFE6",
  carta2: "#EAE4D8",
  inchiostro: "#15171B",
  tenue: "#6E6A62",
  riga: "#D6CFC1",
  verde: "#1E6B52",
  verdeChiaro: "#DCEBE3",
  rosso: "#C8402A",
  rossoChiaro: "#F6DDD6",
  evidenzia: "#F3D35B",
};

export const SLIDE_DENTISTA = 8;

const Evidenzia: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      background: `linear-gradient(180deg, transparent 58%, ${C.evidenzia} 58%, ${C.evidenzia} 92%, transparent 92%)`,
      padding: "0 4px",
    }}
  >
    {children}
  </span>
);

const Cornice: React.FC<{ n: number; etichetta?: string; children: React.ReactNode; scuro?: boolean }> = ({
  n,
  etichetta = "Cosa automatizzerei in…",
  children,
  scuro,
}) => {
  const fg = scuro ? C.carta : C.inchiostro;
  const tenue = scuro ? "#A9A49A" : C.tenue;
  return (
    <AbsoluteFill style={{ background: scuro ? C.inchiostro : C.carta, color: fg, fontFamily: sans }}>
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: tenue,
        }}
      >
        <span>{etichetta}</span>
        <span>
          {String(n).padStart(2, "0")} / {String(SLIDE_DENTISTA).padStart(2, "0")}
        </span>
      </div>
      <div style={{ position: "absolute", top: 150, left: 80, right: 80, bottom: 150 }}>{children}</div>
      <div
        style={{
          position: "absolute",
          bottom: 62,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 24,
          color: tenue,
          borderTop: `2px solid ${scuro ? "#33363D" : C.riga}`,
          paddingTop: 26,
        }}
      >
        <span style={{ fontWeight: 600 }}>federicobellezza.dev</span>
        <span style={{ fontWeight: 600 }}>{n < SLIDE_DENTISTA ? "Scorri  →" : "Salva il post  ↓"}</span>
      </div>
    </AbsoluteFill>
  );
};

const Numero: React.FC<{ n: string; colore?: string }> = ({ n, colore = C.verde }) => (
  <div style={{ fontFamily: serif, fontSize: 150, lineHeight: 0.8, color: colore }}>{n}</div>
);

const Titolo: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 76 }) => (
  <div style={{ fontFamily: serif, fontSize: size, lineHeight: 1.02, letterSpacing: -1 }}>{children}</div>
);

const Testo: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 34 }) => (
  <div style={{ fontSize: size, lineHeight: 1.4, color: "#2B2D31" }}>{children}</div>
);

const Scheda: React.FC<{ voci: [string, string][] }> = ({ voci }) => (
  <div style={{ display: "flex", gap: 16 }}>
    {voci.map(([k, v]) => (
      <div key={k} style={{ flex: 1, background: C.carta2, borderRadius: 18, padding: "18px 22px" }}>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: C.tenue }}>{k}</div>
        <div style={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}>{v}</div>
      </div>
    ))}
  </div>
);

const Bolla: React.FC<{ noi?: boolean; children: React.ReactNode }> = ({ noi, children }) => (
  <div
    style={{
      alignSelf: noi ? "flex-start" : "flex-end",
      maxWidth: "82%",
      background: noi ? "#FFFFFF" : C.verdeChiaro,
      border: `2px solid ${noi ? C.riga : "#B9D6C7"}`,
      borderRadius: noi ? "26px 26px 26px 6px" : "26px 26px 6px 26px",
      padding: "16px 22px",
      fontSize: 27,
      lineHeight: 1.35,
    }}
  >
    {children}
  </div>
);

/* ---------- Slide ---------- */

const S1 = () => (
  <Cornice n={1} etichetta="Serie · Cosa automatizzerei in…">
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", gap: 48 }}>
      <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: C.verde }}>
        Studio dentistico
      </div>
      <Titolo size={118}>
        Cosa automatizzerei <em>domani</em> in uno studio dentistico.
      </Titolo>
      <Testo size={40}>
        3 cose sì, 1 assolutamente no. <Evidenzia>E il no è la parte più importante.</Evidenzia>
      </Testo>
    </div>
  </Cornice>
);

const S2 = () => (
  <Cornice n={2}>
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", gap: 44 }}>
      <Titolo size={92}>
        Il paziente più facile da perdere è <Evidenzia>quello che hai già.</Evidenzia>
      </Titolo>
      <Testo size={36}>
        L'igiene ogni sei mesi, il preventivo che resta in sospeso, il questionario da ricopiare. Quasi tutto passa da
        una segreteria e da un telefono che squilla mentre c'è un paziente al banco.
      </Testo>
      <Testo size={36}>
        Sono tre punti dove le cose si perdono <strong>senza che nessuno se ne accorga.</strong>
      </Testo>
    </div>
  </Cornice>
);

const S3 = () => (
  <Cornice n={3}>
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 30 }}>
      <Numero n="1" />
      <Titolo>I richiami per l'igiene</Titolo>
      <Testo>
        Chi ha fatto l'igiene a maggio, a novembre riceve un messaggio con tre orari liberi presi dall'agenda. Risponde con
        un numero e l'appuntamento è fissato.
      </Testo>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          background: "#FFFFFF",
          border: `2px solid ${C.riga}`,
          borderRadius: 28,
          padding: 26,
        }}
      >
        <Bolla noi>
          Buongiorno Laura, sono passati 6 mesi dalla sua igiene. Ho questi orari: <strong>1</strong> mar 10:00 ·{" "}
          <strong>2</strong> gio 15:30 · <strong>3</strong> ven 9:00
        </Bolla>
        <Bolla>2</Bolla>
        <Bolla noi>Perfetto, giovedì alle 15:30. A presto!</Bolla>
      </div>
      <div style={{ marginTop: "auto" }}>
        <Scheda voci={[["Serve", "Agenda + WhatsApp Business"], ["Per partire", "1-2 settimane"]]} />
      </div>
    </div>
  </Cornice>
);

const Passo: React.FC<{ giorno: string; testo: string; colore?: string; ultimo?: boolean }> = ({
  giorno,
  testo,
  colore = C.verde,
  ultimo,
}) => (
  <div style={{ display: "flex", gap: 26 }}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 30 }}>
      <div style={{ width: 26, height: 26, borderRadius: 99, background: colore, marginTop: 8 }} />
      {!ultimo ? <div style={{ flex: 1, width: 4, background: C.riga, marginTop: 6 }} /> : null}
    </div>
    <div style={{ paddingBottom: ultimo ? 0 : 30 }}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: colore }}>{giorno}</div>
      <div style={{ fontSize: 31, lineHeight: 1.35, marginTop: 4 }}>{testo}</div>
    </div>
  </div>
);

const S4 = () => (
  <Cornice n={4}>
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 30 }}>
      <Numero n="2" />
      <Titolo>I preventivi rimasti in sospeso</Titolo>
      <Testo>
        Un piano di cure consegnato e mai più sentito. Non serve insistere: serve <Evidenzia>non dimenticarsene.</Evidenzia>
      </Testo>
      <div style={{ marginTop: 10 }}>
        <Passo giorno="Giorno 0" testo="Il paziente riceve il preventivo in studio." />
        <Passo giorno="Giorno 7" testo="Un messaggio breve: «Ha dubbi sul piano? La richiamiamo noi.»" />
        <Passo giorno="Se risponde" testo="La segreteria riceve un avviso con la conversazione. Da qui parla una persona." colore={C.inchiostro} ultimo />
      </div>
      <div style={{ marginTop: "auto" }}>
        <Scheda voci={[["Serve", "Gestionale + WhatsApp"], ["Regola", "Un solo promemoria"]]} />
      </div>
    </div>
  </Cornice>
);

const S5 = () => (
  <Cornice n={5}>
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 30 }}>
      <Numero n="3" />
      <Titolo>Il questionario prima della visita</Titolo>
      <Testo>
        Il giorno prima arriva un link: il paziente compila anamnesi e consensi dal telefono. In studio le risposte sono già
        nella sua scheda. <strong>Nessun foglio da ricopiare.</strong>
      </Testo>
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 16 }}>
        <div style={{ flex: 1, background: "#FFFFFF", border: `2px solid ${C.riga}`, borderRadius: 24, padding: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.tenue, letterSpacing: 2, textTransform: "uppercase" }}>
            Dal telefono
          </div>
          {["Allergie a farmaci?", "Terapie in corso?", "Consenso privacy"].map((d) => (
            <div key={d} style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 26, marginTop: 14 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: C.verde }} />
              {d}
            </div>
          ))}
        </div>
        <div style={{ fontFamily: serif, fontSize: 80, color: C.verde }}>→</div>
        <div style={{ flex: 1, background: C.verdeChiaro, borderRadius: 24, padding: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.verde, letterSpacing: 2, textTransform: "uppercase" }}>
            Scheda paziente
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, marginTop: 14 }}>Compilata</div>
          <div style={{ fontSize: 24, color: C.tenue, marginTop: 6 }}>prima che entri in studio</div>
        </div>
      </div>
      <div style={{ marginTop: "auto" }}>
        <Scheda voci={[["Serve", "Modulo online + gestionale"], ["Attenzione", "Dati sanitari"]]} />
      </div>
    </div>
  </Cornice>
);

const S6 = () => (
  <Cornice n={6} scuro etichetta="E invece no">
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", gap: 40 }}>
      <div
        style={{
          alignSelf: "flex-start",
          background: C.rosso,
          color: "#FFF",
          borderRadius: 999,
          padding: "12px 28px",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        Non lo automatizzerei
      </div>
      <Titolo size={96}>Le risposte su dolore, urgenze e domande cliniche.</Titolo>
      <div style={{ fontSize: 36, lineHeight: 1.4, color: "#D9D4CA" }}>
        Un assistente può riconoscere il messaggio «ho un dente gonfio da ieri». Il suo unico compito è{" "}
        <span style={{ color: "#FFF", fontWeight: 700 }}>passarlo subito a una persona</span>, con un avviso in evidenza.
      </div>
      <div style={{ fontSize: 36, lineHeight: 1.4, color: "#D9D4CA" }}>Nessun consiglio medico da un bot. Mai.</div>
    </div>
  </Cornice>
);

const Domanda: React.FC<{ n: number; d: string; perche: string }> = ({ n, d, perche }) => (
  <div style={{ display: "flex", gap: 26, borderTop: `2px solid ${C.riga}`, paddingTop: 26 }}>
    <div style={{ fontFamily: serif, fontSize: 64, lineHeight: 0.9, color: C.verde, width: 50 }}>{n}</div>
    <div>
      <div style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.25 }}>{d}</div>
      <div style={{ fontSize: 27, color: C.tenue, marginTop: 8, lineHeight: 1.35 }}>{perche}</div>
    </div>
  </div>
);

const S7 = () => (
  <Cornice n={7}>
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", gap: 30 }}>
      <Titolo size={80}>
        Prima di farlo, chiedi <Evidenzia>queste 3 cose</Evidenzia> a chi te lo propone.
      </Titolo>
      <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 20 }}>
        <Domanda
          n={1}
          d="Il nostro gestionale permette di leggere e scrivere i dati?"
          perche="Se no, l'automazione resta a metà e qualcuno ricopia a mano."
        />
        <Domanda
          n={2}
          d="Dove finiscono i dati dei pazienti?"
          perche="Sono dati sanitari: servono consensi chiari e fornitori con server in Europa."
        />
        <Domanda n={3} d="Chi riceve i casi che l'automazione non sa gestire?" perche="Deve esserci sempre una persona, con un nome." />
      </div>
    </div>
  </Cornice>
);

const S8 = () => (
  <Cornice n={8}>
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", gap: 44 }}>
      <Titolo size={104}>
        Da dove partirei? <em>Dai richiami.</em>
      </Titolo>
      <Testo size={38}>
        Sono i più semplici da mettere in piedi e i primi che si vedono in agenda.
      </Testo>
      <div style={{ background: C.inchiostro, color: C.carta, borderRadius: 32, padding: "36px 40px" }}>
        <div style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.3 }}>
          Hai uno studio? In 30 minuti ti dico cosa conviene automatizzare e cosa no.
        </div>
        <div style={{ fontSize: 28, color: "#BDB7AB", marginTop: 14 }}>Call gratuita · link in bio</div>
      </div>
      <Testo size={30}>Conosci qualcuno che gestisce uno studio? Mandaglielo.</Testo>
    </div>
  </Cornice>
);

const SLIDE = [S1, S2, S3, S4, S5, S6, S7, S8];

export const CaroselloDentista: React.FC = () => {
  const frame = useCurrentFrame();
  const Slide = SLIDE[Math.min(frame, SLIDE.length - 1)];
  return <Slide />;
};
