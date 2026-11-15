import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Icona, Scena, TitoloScena, useEntrata } from "../componenti/base";
import { T } from "../tema";
import type { Riga, ScenaSchermata } from "../tipi";

const STATI: Record<Riga["stato"], { testo: string; colore: string }> = {
  ok: { testo: "Fatto", colore: T.accento },
  attesa: { testo: "Da controllare", colore: T.attesa },
  nuovo: { testo: "Nuovo", colore: T.accento2 },
};

/** Finestra di un'app: righe che arrivano una alla volta, oppure lo screenshot di un progetto reale. */
export const Schermata: React.FC<{ scena: ScenaSchermata; durata: number }> = ({ scena, durata }) => {
  const e = useEntrata(0, 16);
  return (
    <Scena durata={durata}>
      <TitoloScena testo={scena.titolo} />
      <div
        style={{
          position: "absolute",
          top: 420,
          left: 90,
          width: 860,
          height: scena.immagine ? 600 : undefined,
          maxHeight: 820,
          borderRadius: 40,
          background: T.pannello,
          border: `3px solid ${T.linea}`,
          boxShadow: "0 40px 120px rgba(0,0,0,0.5)",
          overflow: "hidden",
          transform: `scale(${0.94 + 0.06 * e})`,
          opacity: e,
        }}
      >
        <div
          style={{
            height: 76,
            background: T.pannello2,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 30px",
            borderBottom: `2px solid ${T.linea}`,
          }}
        >
          {["#FF6B6B", "#FFC870", "#6EF0B8"].map((c) => (
            <div key={c} style={{ width: 20, height: 20, borderRadius: 99, background: c, opacity: 0.8 }} />
          ))}
          <div style={{ marginLeft: 20, fontSize: 28, color: T.tenue }}>{scena.app ?? "La tua app"}</div>
        </div>
        {scena.immagine ? (
          <Screenshot src={scena.immagine} durata={durata} />
        ) : (
          <Righe righe={scena.righe ?? []} durata={durata} />
        )}
      </div>
    </Scena>
  );
};

const Righe: React.FC<{ righe: Riga[]; durata: number }> = ({ righe, durata }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const passo = (durata * 0.65) / Math.max(1, righe.length);
  return (
    <div style={{ padding: 34, display: "flex", flexDirection: "column", gap: 22 }}>
      {righe.map((r, i) => {
        const s = spring({ frame: frame - 8 - Math.round(i * passo), fps, durationInFrames: 14, config: { damping: 200 } });
        const stato = STATI[r.stato];
        return (
          <div
            key={i}
            style={{
              // Solo opacità e spostamento: lo spazio della riga è riservato da subito,
              // così la finestra non cambia altezza mentre le righe arrivano.
              opacity: s,
              transform: `translateY(${(1 - s) * 30}px)`,
              background: T.pannello2,
              borderRadius: 28,
              padding: "26px 28px",
              display: "flex",
              alignItems: "center",
              gap: 24,
              borderLeft: `8px solid ${stato.colore}`,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.2 }}>{r.testo}</div>
              {r.dettaglio ? <div style={{ fontSize: 26, color: T.tenue, marginTop: 6 }}>{r.dettaglio}</div> : null}
            </div>
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 24,
                fontWeight: 600,
                color: stato.colore,
                background: `${stato.colore}1F`,
                borderRadius: 99,
                padding: "10px 18px",
              }}
            >
              {r.stato === "ok" ? <Icona nome="check" size={26} colore={stato.colore} /> : null}
              {r.etichetta ?? stato.testo}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Screenshot: React.FC<{ src: string; durata: number }> = ({ src, durata }) => {
  const frame = useCurrentFrame();
  // Zoom e scorrimento lenti, per dare vita a un'immagine ferma.
  const zoom = interpolate(frame, [0, durata], [1.02, 1.12]);
  const y = interpolate(frame, [0, durata], [0, -40]);
  return (
    <div style={{ width: "100%", height: 524, overflow: "hidden" }}>
      <Img
        src={staticFile(src)}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", transform: `translateY(${y}px) scale(${zoom})` }}
      />
    </div>
  );
};
