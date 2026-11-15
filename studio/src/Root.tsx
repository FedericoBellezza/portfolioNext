import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { CaroselloDentista, SLIDE_DENTISTA } from "./caroselli/Dentista";
import { frameScena, Reel } from "./Reel";
import { ALTEZZA, FPS, LARGHEZZA } from "./tema";
import type { PropsReel, Reel as TipoReel } from "./tipi";

/**
 * Una sola composizione: `id` sceglie quale reel caricare da
 * public/reel/<id>/reel.json (scritto da scripts/voce.mjs).
 * La durata è la somma delle scene, calcolata dalla voce.
 */
const calcola: CalculateMetadataFunction<PropsReel> = async ({ props }) => {
  const res = await fetch(staticFile(`reel/${props.id}/reel.json`));
  if (!res.ok) throw new Error(`Manca public/reel/${props.id}/reel.json: lancia prima "npm run voce -- ${props.id}"`);
  const reel = (await res.json()) as TipoReel;
  const durationInFrames = reel.scene.reduce((tot, s) => tot + frameScena(s), 0);
  return { durationInFrames, props: { ...props, reel } };
};

export const RemotionRoot: React.FC = () => (
  <>
    {/* Caroselli: un frame = una slide, 1080×1350 (4:5). */}
    <Composition
      id="Carosello-dentista"
      component={CaroselloDentista}
      width={1080}
      height={1350}
      fps={1}
      durationInFrames={SLIDE_DENTISTA}
    />
    <Composition
    id="Reel"
    component={Reel}
    width={LARGHEZZA}
    height={ALTEZZA}
    fps={FPS}
    durationInFrames={FPS * 30}
    defaultProps={{ id: "pilota-1" } as PropsReel}
    calculateMetadata={calcola}
    />
  </>
);
