import React from "react";
import { useCurrentFrame } from "remotion";
import { Icona, Scena, useEntrata } from "../componenti/base";
import { T } from "../tema";
import type { ScenaCta } from "../tipi";

/** Chiusura: cosa fare adesso. Resta ferma abbastanza da essere letta. */
export const Cta: React.FC<{ scena: ScenaCta; durata: number }> = ({ scena, durata }) => {
  const frame = useCurrentFrame();
  const logo = useEntrata(0, 16);
  const titolo = useEntrata(6);
  const sotto = useEntrata(14);
  const pill = useEntrata(24);
  const pulsa = 1 + 0.04 * Math.sin(frame / 5);

  return (
    <Scena durata={durata}>
      <div
        style={{
          position: "absolute",
          top: 320,
          left: 90,
          right: 90,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 46,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 170,
            height: 170,
            borderRadius: 48,
            background: `linear-gradient(135deg, ${T.accento}, ${T.accento2})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: logo,
            transform: `scale(${0.6 + 0.4 * logo}) rotate(${(1 - logo) * -12}deg)`,
            boxShadow: `0 20px 80px ${T.accento}55`,
          }}
        >
          <Icona nome="ai" size={96} colore={T.sfondo} />
        </div>
        <div
          style={{
            fontSize: 78,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: -2,
            opacity: titolo,
            transform: `translateY(${(1 - titolo) * 30}px)`,
          }}
        >
          {scena.titolo}
        </div>
        <div style={{ fontSize: 40, color: T.tenue, lineHeight: 1.3, opacity: sotto }}>{scena.sottotitolo}</div>
        <div
          style={{
            marginTop: 10,
            opacity: pill,
            transform: `scale(${pill * pulsa})`,
            background: T.accento,
            color: T.sfondo,
            borderRadius: 999,
            padding: "26px 48px",
            fontSize: 42,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          Link in bio ↑
        </div>
        <div style={{ fontSize: 34, color: T.tenue, opacity: pill }}>{scena.handle}</div>
      </div>
    </Scena>
  );
};
