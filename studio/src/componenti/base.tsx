import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  Bell,
  CalendarCheck,
  CircleCheck,
  ClipboardList,
  Database,
  FileText,
  Filter,
  Lock,
  Mail,
  MessageCircle,
  Search,
  Send,
  Sheet,
  Sparkles,
  User,
} from "lucide-react";
import { T } from "../tema";
import type { NomeIcona } from "../tipi";

/** Molla standard per le entrate: veloce, senza rimbalzo vistoso. */
export function useEntrata(ritardo = 0, durata = 18) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - ritardo,
    fps,
    durationInFrames: durata,
    config: { damping: 200 },
  });
}

/**
 * Avvolge una scena: entra salendo leggermente, esce sfumando negli ultimi
 * frame. `durata` è la lunghezza della scena in frame.
 */
export const Scena: React.FC<{ durata: number; children: React.ReactNode }> = ({
  durata,
  children,
}) => {
  const frame = useCurrentFrame();
  const entrata = useEntrata(0, 14);
  const uscita = interpolate(frame, [durata - 8, durata], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(entrata, uscita),
        transform: `translateY(${(1 - entrata) * 40}px)`,
        fontFamily: T.font,
        color: T.testo,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Sfondo continuo per tutto il reel: bagliori lenti e griglia leggera. */
export const Sfondo: React.FC = () => {
  const frame = useCurrentFrame();
  const x1 = 30 + Math.sin(frame / 90) * 12;
  const y1 = 22 + Math.cos(frame / 110) * 6;
  const x2 = 75 + Math.cos(frame / 120) * 10;
  const y2 = 78 + Math.sin(frame / 100) * 6;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${x1}% ${y1}%, ${T.accento}22 0%, transparent 38%),
          radial-gradient(circle at ${x2}% ${y2}%, ${T.accento2}26 0%, transparent 42%),
          linear-gradient(180deg, ${T.sfondo} 0%, ${T.sfondo2} 100%)`,
      }}
    >
      <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.18 }}>
        <defs>
          <pattern id="griglia" width="72" height="72" patternUnits="userSpaceOnUse">
            <path d="M 72 0 L 0 0 0 72" fill="none" stroke={T.linea} strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#griglia)" />
      </svg>
    </AbsoluteFill>
  );
};

const ICONE: Record<NomeIcona, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  email: Mail,
  form: ClipboardList,
  ai: Sparkles,
  db: Database,
  doc: FileText,
  whatsapp: MessageCircle,
  calendario: CalendarCheck,
  check: CircleCheck,
  excel: Sheet,
  campanella: Bell,
  filtro: Filter,
  lucchetto: Lock,
  utente: User,
  invio: Send,
  cerca: Search,
};

export const Icona: React.FC<{ nome: NomeIcona; size?: number; colore?: string }> = ({
  nome,
  size = 44,
  colore = T.testo,
}) => {
  const C = ICONE[nome] ?? Sparkles;
  return <C size={size} color={colore} strokeWidth={2} />;
};

/** Titolo piccolo in alto nelle scene (sotto l'area dell'intestazione IG). */
export const TitoloScena: React.FC<{ testo: string; ritardo?: number }> = ({
  testo,
  ritardo = 2,
}) => {
  const e = useEntrata(ritardo);
  return (
    <div
      style={{
        position: "absolute",
        top: 250,
        left: 80,
        right: 80,
        textAlign: "center",
        fontSize: 50,
        fontWeight: 800,
        lineHeight: 1.15,
        letterSpacing: -1,
        opacity: e,
        transform: `translateY(${(1 - e) * 20}px)`,
      }}
    >
      {testo}
    </div>
  );
};

/** Divide "testo con *accento*" in parole con il flag d'accento. */
export function paroleConAccento(testo: string) {
  const out: { parola: string; accento: boolean }[] = [];
  let accento = false;
  for (const grezza of testo.split(/\s+/).filter(Boolean)) {
    let p = grezza;
    const apre = p.startsWith("*");
    if (apre) {
      accento = true;
      p = p.slice(1);
    }
    const chiude = p.endsWith("*") || /\*[.,!?;:»"]+$/.test(p);
    p = p.replace(/\*/g, "");
    out.push({ parola: p, accento });
    if (chiude) accento = false;
  }
  return out;
}
