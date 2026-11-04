import { formatEUR, type Cents } from "@/lib/fiscale/money";

export const eur = (c: Cents) => formatEUR(c);
export const pct = (r: number, digits = 1) =>
  new Intl.NumberFormat("it-IT", { style: "percent", maximumFractionDigits: digits }).format(r);

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", timeZone: "UTC" });
export const date = (iso: string | null) => (iso ? dateFmt.format(new Date(`${iso}T00:00:00Z`)) : "—");
export const shortDate = (iso: string) => shortFmt.format(new Date(`${iso}T00:00:00Z`));
export const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

export const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
