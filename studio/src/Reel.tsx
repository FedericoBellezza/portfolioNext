import React from "react";
import { AbsoluteFill, Audio, Series, staticFile } from "remotion";
import { Sfondo } from "./componenti/base";
import { Sottotitoli } from "./componenti/Sottotitoli";
import { Aggancio } from "./scene/Aggancio";
import { Chat } from "./scene/Chat";
import { Confronto } from "./scene/Confronto";
import { Cta } from "./scene/Cta";
import { Schermata } from "./scene/Schermata";
import { Workflow } from "./scene/Workflow";
import { FPS } from "./tema";
import type { PropsReel, Scena } from "./tipi";

/** Durata di una scena in frame. Senza voce generata usa 4 secondi. */
export function frameScena(s: Scena) {
  return Math.max(2 * FPS, Math.round((s.durata ?? 4) * FPS));
}

const Contenuto: React.FC<{ scena: Scena; durata: number }> = ({ scena, durata }) => {
  switch (scena.tipo) {
    case "aggancio":
      return <Aggancio scena={scena} durata={durata} />;
    case "chat":
      return <Chat scena={scena} durata={durata} />;
    case "workflow":
      return <Workflow scena={scena} durata={durata} />;
    case "confronto":
      return <Confronto scena={scena} durata={durata} />;
    case "schermata":
      return <Schermata scena={scena} durata={durata} />;
    case "cta":
      return <Cta scena={scena} durata={durata} />;
  }
};

export const Reel: React.FC<PropsReel> = ({ reel }) => {
  if (!reel) return <Sfondo />;
  return (
    <AbsoluteFill>
      <Sfondo />
      {reel.musica ? <Audio src={staticFile(reel.musica.src)} volume={reel.musica.volume ?? 0.1} loop /> : null}
      <Series>
        {reel.scene.map((scena, i) => {
          const durata = frameScena(scena);
          return (
            <Series.Sequence key={i} durationInFrames={durata} name={`${i + 1}. ${scena.tipo}`}>
              <Contenuto scena={scena} durata={durata} />
              {scena.audio ? <Audio src={staticFile(scena.audio)} /> : null}
              <Sottotitoli parole={scena.parole} />
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
