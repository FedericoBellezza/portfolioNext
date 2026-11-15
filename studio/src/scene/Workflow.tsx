import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Icona, Scena, TitoloScena } from "../componenti/base";
import { T } from "../tema";
import type { ScenaWorkflow } from "../tipi";

const ALTEZZA_NODO = 132;
const SPAZIO = 54;

/** Nodi verticali che si accendono uno dopo l'altro, con un impulso tra l'uno e l'altro. */
export const Workflow: React.FC<{ scena: ScenaWorkflow; durata: number }> = ({ scena, durata }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = scena.nodi.length;
  const totale = n * ALTEZZA_NODO + (n - 1) * SPAZIO;
  const top = 400 + Math.max(0, (840 - totale) / 2);
  // Accensioni distribuite tra il 10% e l'80% della scena.
  const acceso = (i: number) => Math.round(durata * 0.1 + (durata * 0.7 * i) / Math.max(1, n - 1));

  return (
    <Scena durata={durata}>
      <TitoloScena testo={scena.titolo} />
      {scena.nodi.map((nodo, i) => {
        const y = top + i * (ALTEZZA_NODO + SPAZIO);
        const comparsa = spring({ frame: frame - i * 4, fps, durationInFrames: 14, config: { damping: 200 } });
        const on = spring({ frame: frame - acceso(i), fps, durationInFrames: 10, config: { damping: 15 } });
        const fatto = i < n - 1 ? frame >= acceso(i + 1) : frame >= acceso(i) + 12;
        return (
          <React.Fragment key={i}>
            {i < n - 1 ? (
              <Connettore y={y + ALTEZZA_NODO} da={acceso(i)} a={acceso(i + 1)} />
            ) : null}
            <div
              style={{
                position: "absolute",
                top: y,
                left: 110,
                width: 820,
                height: ALTEZZA_NODO,
                borderRadius: 36,
                background: T.pannello,
                border: `3px solid ${on > 0.5 ? T.accento : T.linea}`,
                boxShadow: on > 0.5 ? `0 0 ${50 * on}px ${T.accento}55` : "none",
                display: "flex",
                alignItems: "center",
                gap: 30,
                padding: "0 34px",
                opacity: comparsa * (0.45 + 0.55 * on),
                transform: `translateX(${(1 - comparsa) * -60}px) scale(${1 + 0.03 * on - 0.03 * (fatto ? 1 : 0) * on})`,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  flexShrink: 0,
                  borderRadius: 24,
                  background: on > 0.5 ? `${T.accento}22` : T.pannello2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icona nome={nodo.icona} size={44} colore={on > 0.5 ? T.accento : T.tenue} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.1 }}>{nodo.etichetta}</div>
                {nodo.dettaglio ? (
                  <div style={{ fontSize: 27, color: T.tenue, marginTop: 6, lineHeight: 1.2 }}>{nodo.dettaglio}</div>
                ) : null}
              </div>
              <div style={{ opacity: fatto ? 1 : 0, transform: `scale(${fatto ? 1 : 0.5})` }}>
                <Icona nome="check" size={46} colore={T.accento} />
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </Scena>
  );
};

const Connettore: React.FC<{ y: number; da: number; a: number }> = ({ y, da, a }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [da + 4, a], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: y, left: 210, width: 6, height: SPAZIO }}>
      <div style={{ position: "absolute", inset: 0, background: T.linea, borderRadius: 3 }} />
      <div
        style={{ position: "absolute", top: 0, left: 0, width: 6, height: `${p * 100}%`, background: T.accento, borderRadius: 3 }}
      />
      {p > 0 && p < 1 ? (
        <div
          style={{
            position: "absolute",
            top: `${p * 100}%`,
            left: -9,
            width: 24,
            height: 24,
            marginTop: -12,
            borderRadius: 99,
            background: T.accento,
            boxShadow: `0 0 24px ${T.accento}`,
          }}
        />
      ) : null}
    </div>
  );
};
