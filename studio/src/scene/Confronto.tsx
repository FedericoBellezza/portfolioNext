import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Scena, TitoloScena, useEntrata } from "../componenti/base";
import { T } from "../tema";
import type { Misura, ScenaConfronto } from "../tipi";

/** Prima / dopo con i numeri che contano. La nota dice sempre da dove viene il dato. */
export const Confronto: React.FC<{ scena: ScenaConfronto; durata: number }> = ({ scena, durata }) => {
  const nota = useEntrata(Math.round(durata * 0.55));
  const freccia = useEntrata(Math.round(durata * 0.3));
  return (
    <Scena durata={durata}>
      <TitoloScena testo={scena.titolo} />
      <Carta misura={scena.prima} titolo="Prima" colore={T.prima} top={420} ritardo={6} />
      <div
        style={{
          position: "absolute",
          top: 735,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 70,
          color: T.accento,
          opacity: freccia,
          transform: `translateY(${(1 - freccia) * -20}px)`,
        }}
      >
        ↓
      </div>
      <Carta misura={scena.dopo} titolo="Dopo" colore={T.accento} top={840} ritardo={Math.round(durata * 0.32)} />
      <div
        style={{
          position: "absolute",
          top: 1175,
          left: 120,
          right: 120,
          textAlign: "center",
          fontSize: 28,
          color: T.tenue,
          fontStyle: "italic",
          opacity: nota,
        }}
      >
        {scena.nota}
      </div>
    </Scena>
  );
};

const Carta: React.FC<{ misura: Misura; titolo: string; colore: string; top: number; ritardo: number }> = ({
  misura,
  titolo,
  colore,
  top,
  ritardo,
}) => {
  const frame = useCurrentFrame();
  const e = useEntrata(ritardo);
  const valore = interpolate(frame, [ritardo, ritardo + 22], [0, misura.valore], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const decimali = Number.isInteger(misura.valore) ? 0 : 1;
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 140,
        width: 800,
        height: 290,
        borderRadius: 44,
        background: T.pannello,
        border: `3px solid ${colore}66`,
        padding: "34px 48px",
        opacity: e,
        transform: `scale(${0.9 + 0.1 * e})`,
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: colore }}>
        {titolo}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 4 }}>
        <span style={{ fontSize: 130, fontWeight: 800, letterSpacing: -4, fontVariantNumeric: "tabular-nums" }}>
          {valore.toFixed(decimali).replace(".", ",")}
        </span>
        <span style={{ fontSize: 50, fontWeight: 600 }}>{misura.unita}</span>
      </div>
      {misura.etichetta ? <div style={{ fontSize: 32, color: T.tenue, marginTop: -6 }}>{misura.etichetta}</div> : null}
    </div>
  );
};
