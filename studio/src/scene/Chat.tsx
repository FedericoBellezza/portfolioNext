import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Icona, Scena, useEntrata } from "../componenti/base";
import { T } from "../tema";
import type { Messaggio, ScenaChat } from "../tipi";

const FINESTRA = { top: 250, left: 120, width: 840, height: 1000 };

/** Quando compare il messaggio i: distribuiti nel primo 75% della scena. */
function tempi(n: number, durata: number) {
  const inizio = 8;
  const fine = durata * 0.75;
  return Array.from({ length: n }, (_, i) => Math.round(inizio + ((fine - inizio) * i) / Math.max(1, n - 1)));
}

export const Chat: React.FC<{ scena: ScenaChat; durata: number }> = ({ scena, durata }) => {
  const e = useEntrata(0, 16);
  return (
    <Scena durata={durata}>
      <div
        style={{
          position: "absolute",
          ...FINESTRA,
          // La chat ha un'altezza fissa (i messaggi arrivano), la mail si adatta al testo.
          height: scena.app === "whatsapp" ? FINESTRA.height : undefined,
          maxHeight: FINESTRA.height,
          borderRadius: 56,
          background: T.pannello,
          border: `3px solid ${T.linea}`,
          boxShadow: "0 40px 120px rgba(0,0,0,0.5)",
          overflow: "hidden",
          transform: `scale(${0.94 + 0.06 * e})`,
        }}
      >
        {scena.app === "whatsapp" ? <WhatsApp scena={scena} durata={durata} /> : <Email scena={scena} durata={durata} />}
      </div>
    </Scena>
  );
};

const WhatsApp: React.FC<{ scena: ScenaChat; durata: number }> = ({ scena, durata }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = tempi(scena.messaggi.length, durata);
  return (
    <>
      <div
        style={{
          height: 140,
          background: T.pannello2,
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: "0 40px",
          borderBottom: `2px solid ${T.linea}`,
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 999,
            background: T.linea,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icona nome="utente" size={40} colore={T.tenue} />
        </div>
        <div>
          <div style={{ fontSize: 38, fontWeight: 600 }}>{scena.intestazione}</div>
          <div style={{ fontSize: 26, color: T.accento }}>online</div>
        </div>
      </div>
      <div style={{ padding: "36px 36px", display: "flex", flexDirection: "column", gap: 22 }}>
        {scena.messaggi.map((m, i) => {
          const daQui = frame - t[i];
          // Prima delle nostre risposte compaiono i tre puntini.
          const scrive = m.da === "noi" && daQui > -14 && daQui < 0;
          if (scrive) return <Puntini key={i} />;
          if (daQui < 0) return null;
          const s = spring({ frame: daQui, fps, durationInFrames: 12, config: { damping: 18 } });
          return <Bolla key={i} m={m} s={s} />;
        })}
      </div>
    </>
  );
};

const Bolla: React.FC<{ m: Messaggio; s: number }> = ({ m, s }) => {
  const noi = m.da === "noi";
  return (
    <div
      style={{
        alignSelf: noi ? "flex-end" : "flex-start",
        maxWidth: "80%",
        background: noi ? T.bolla : T.pannello2,
        border: `2px solid ${noi ? `${T.accento}55` : T.linea}`,
        borderRadius: noi ? "30px 30px 8px 30px" : "30px 30px 30px 8px",
        padding: "20px 28px",
        fontSize: 34,
        lineHeight: 1.3,
        opacity: s,
        transform: `translateY(${(1 - s) * 24}px) scale(${0.92 + 0.08 * s})`,
        transformOrigin: noi ? "right bottom" : "left bottom",
      }}
    >
      {m.testo}
      {m.ora ? (
        <div style={{ fontSize: 22, color: T.tenue, textAlign: "right", marginTop: 6 }}>{m.ora}</div>
      ) : null}
    </div>
  );
};

const Puntini: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        alignSelf: "flex-end",
        background: T.bolla,
        borderRadius: 30,
        padding: "24px 30px",
        display: "flex",
        gap: 12,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 16,
            height: 16,
            borderRadius: 99,
            background: T.accento,
            opacity: 0.35 + 0.65 * Math.abs(Math.sin((frame + i * 5) / 6)),
          }}
        />
      ))}
    </div>
  );
};

const Email: React.FC<{ scena: ScenaChat; durata: number }> = ({ scena, durata }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [mail, ...risposte] = scena.messaggi;
  const fineScrittura = durata * (risposte.length ? 0.5 : 0.8);
  const caratteri = Math.round(
    interpolate(frame, [6, fineScrittura], [0, mail?.testo.length ?? 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  return (
    <div style={{ padding: 48, display: "flex", flexDirection: "column", gap: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, color: T.tenue, fontSize: 28 }}>
        <Icona nome="email" size={38} colore={T.accento2} />
        Posta in arrivo
      </div>
      <Campo nome="Da" valore={scena.intestazione} />
      <Campo nome="Oggetto" valore={mail?.etichetta ?? ""} />
      {/* Il testo completo, invisibile, tiene il posto: la finestra non cresce mentre "scrive". */}
      <div style={{ fontSize: 34, lineHeight: 1.4, position: "relative" }}>
        <span style={{ visibility: "hidden" }}>{mail?.testo}</span>
        <span style={{ position: "absolute", inset: 0 }}>{mail?.testo.slice(0, caratteri)}</span>
      </div>
      {risposte.map((r, i) => {
        const s = spring({
          frame: frame - Math.round(durata * 0.58) - i * 10,
          fps,
          durationInFrames: 14,
          config: { damping: 200 },
        });
        // Anche la bozza occupa il suo spazio da subito (invisibile): la finestra non salta.
        return (
          <div
            key={i}
            style={{
              opacity: s,
              transform: `translateY(${(1 - s) * 30}px)`,
              border: `2px solid ${T.accento}66`,
              background: `${T.accento}12`,
              borderRadius: 28,
              padding: "22px 28px",
            }}
          >
            <div style={{ fontSize: 24, color: T.accento, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
              {r.etichetta ?? "Bozza pronta"}
            </div>
            <div style={{ fontSize: 32, lineHeight: 1.35, marginTop: 8 }}>{r.testo}</div>
          </div>
        );
      })}
    </div>
  );
};

const Campo: React.FC<{ nome: string; valore: string }> = ({ nome, valore }) => (
  <div style={{ display: "flex", gap: 18, fontSize: 32, borderBottom: `2px solid ${T.linea}`, paddingBottom: 18 }}>
    <span style={{ color: T.tenue, width: 150 }}>{nome}</span>
    <span style={{ fontWeight: 600 }}>{valore}</span>
  </div>
);
