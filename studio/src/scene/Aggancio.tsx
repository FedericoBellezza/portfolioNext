import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { paroleConAccento, Scena, useEntrata } from "../componenti/base";
import { T } from "../tema";
import type { ScenaAggancio } from "../tipi";

/** Primi 3 secondi: una domanda grande, parola per parola. */
export const Aggancio: React.FC<{ scena: ScenaAggancio; durata: number }> = ({ scena, durata }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pill = useEntrata(0, 12);
  const parole = paroleConAccento(scena.titolo);
  const lunghezza = scena.titolo.length;
  const fontSize = lunghezza > 70 ? 82 : lunghezza > 45 ? 96 : 112;

  return (
    <Scena durata={durata}>
      <div
        style={{
          position: "absolute",
          top: 330,
          left: 80,
          right: 80,
          height: 860,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 44,
        }}
      >
        {scena.sopratitolo ? (
          <div
            style={{
              opacity: pill,
              transform: `scale(${0.8 + 0.2 * pill})`,
              border: `2px solid ${T.accento}`,
              color: T.accento,
              borderRadius: 999,
              padding: "12px 30px",
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {scena.sopratitolo}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: `0 ${fontSize * 0.26}px`,
            fontSize,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -3,
            textAlign: "center",
          }}
        >
          {parole.map((p, i) => {
            const e = spring({
              frame: frame - 4 - i * 3,
              fps,
              durationInFrames: 14,
              config: { damping: 16, stiffness: 180 },
            });
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: Math.min(1, e * 1.4),
                  transform: `translateY(${(1 - e) * 50}px)`,
                  color: p.accento ? T.accento : T.testo,
                }}
              >
                {p.parola}
              </span>
            );
          })}
        </div>
      </div>
    </Scena>
  );
};
