import { loadFont } from "@remotion/google-fonts/Geist";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "800"],
  subsets: ["latin"],
});

/**
 * Identità visiva dei reel. Provvisoria finché non scegliamo il brand della
 * pagina: tutti i colori passano da qui, quindi cambiarla è un file solo.
 */
export const T = {
  font: fontFamily,
  sfondo: "#0A0F1E",
  sfondo2: "#111833",
  pannello: "#151D38",
  pannello2: "#1C2547",
  linea: "#2A3560",
  testo: "#F3F5FF",
  tenue: "#97A3C7",
  accento: "#6EF0B8",
  accento2: "#7EA6FF",
  attesa: "#FFC870",
  prima: "#FF7D88",
  bolla: "#123D33",
} as const;

export const FPS = 30;
export const LARGHEZZA = 1080;
export const ALTEZZA = 1920;

/**
 * Aree sicure di un reel: in alto c'è l'intestazione di Instagram, in basso
 * didascalia e pulsanti, a destra le icone. Il contenuto resta qui dentro.
 */
export const SICURA = {
  alto: 230,
  basso: 1500,
  sinistra: 70,
  destra: 1080 - 150,
} as const;

/** Fascia in cui stanno i sottotitoli, sotto il contenuto della scena. */
export const SOTTOTITOLI_Y = 1300;
