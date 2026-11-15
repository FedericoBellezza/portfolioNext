import React, { useMemo } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SOTTOTITOLI_Y, T } from "../tema";
import type { Parola } from "../tipi";

type Gruppo = { parole: Parola[]; inizio: number; fine: number };

/** Blocchi da massimo 3 parole, spezzati anche sulla punteggiatura. */
function raggruppa(parole: Parola[]): Gruppo[] {
  const gruppi: Gruppo[] = [];
  let cur: Parola[] = [];
  const chiudi = () => {
    if (cur.length) gruppi.push({ parole: cur, inizio: cur[0].inizio, fine: cur[cur.length - 1].fine });
    cur = [];
  };
  for (const p of parole) {
    cur.push(p);
    if (cur.length >= 3 || /[.,!?;:]$/.test(p.testo)) chiudi();
  }
  chiudi();
  // Ogni gruppo resta a schermo fino all'inizio del successivo, così non lampeggia.
  for (let i = 0; i < gruppi.length - 1; i++) gruppi[i].fine = gruppi[i + 1].inizio;
  if (gruppi.length) gruppi[gruppi.length - 1].fine += 0.4;
  return gruppi;
}

export const Sottotitoli: React.FC<{ parole?: Parola[] }> = ({ parole }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gruppi = useMemo(() => raggruppa(parole ?? []), [parole]);
  const t = frame / fps;
  const g = gruppi.find((x) => t >= x.inizio && t < x.fine);
  if (!g) return null;

  const pop = spring({
    frame: frame - Math.round(g.inizio * fps),
    fps,
    durationInFrames: 8,
    config: { damping: 14, stiffness: 220 },
  });

  return (
    <div
      style={{
        position: "absolute",
        top: SOTTOTITOLI_Y,
        left: 90,
        width: 840,
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: "0 18px",
        fontFamily: T.font,
        fontSize: 68,
        fontWeight: 800,
        lineHeight: 1.12,
        letterSpacing: -1,
        textAlign: "center",
        transform: `scale(${0.9 + 0.1 * pop})`,
      }}
    >
      {g.parole.map((p, i) => {
        const attiva = t >= p.inizio;
        return (
          <span
            key={i}
            style={{
              color: attiva ? T.testo : `${T.testo}66`,
              textShadow: "0 4px 18px rgba(0,0,0,0.65), 0 0 2px rgba(0,0,0,0.9)",
              background: attiva && t < p.fine + 0.05 ? `${T.accento}33` : "transparent",
              borderRadius: 14,
              padding: "0 8px",
            }}
          >
            {p.testo}
          </span>
        );
      })}
    </div>
  );
};
