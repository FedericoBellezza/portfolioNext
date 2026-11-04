/**
 * Non-payment deadlines: filings of the business (dichiarazione dei redditi,
 * dichiarazione retribuzioni INAIL, ...) and the owner's own reminders
 * (personal or business). Pure functions, no I/O.
 */

import type { Cents } from "./money";
import { shiftToBusinessDay, yearOf } from "./tax-calculator";
import type { FiscalProfile } from "./tax-config";

export type TaskScope = "business" | "personal";
export type TaskGuide = "redditi" | "inail-filing" | "inps35";

export interface TaskItem {
  /** Stable id used to mark it as done (fiscale.task_completions.task_key). */
  key: string;
  dueDate: string;
  title: string;
  scope: TaskScope;
  source: "system" | "custom";
  amount?: Cents | null;
  note?: string | null;
  guide?: TaskGuide;
  reminderId?: string;
}

export interface Reminder {
  id: string;
  title: string;
  scope: TaskScope;
  firstDue: string;
  recurrence: "once" | "monthly" | "yearly";
  amount: Cents | null;
  notes: string | null;
}

const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
/** Same day in another month, clamped to the month end (31 → 30, 29/2 → 28/2). */
const onDay = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(Math.min(d, lastDay(y, m)))}`;

/** Filings of the business due in a calendar year. */
export function buildFilings(year: number, profile: FiscalProfile, opts: { inail: boolean }): TaskItem[] {
  const startYear = yearOf(profile.activityStartDate);
  const items: TaskItem[] = [];
  if (year <= startYear) return items;

  items.push({
    key: `filing:redditi:${year}`,
    dueDate: shiftToBusinessDay(`${year}-10-31`),
    title: `Dichiarazione dei redditi ${year - 1} (Modello Redditi PF)`,
    scope: "business",
    source: "system",
    guide: "redditi",
  });

  if (opts.inail) {
    items.push({
      key: `filing:inail:${year}`,
      dueDate: shiftToBusinessDay(onDay(year, 2, 28)),
      title: `Dichiarazione retribuzioni INAIL ${year - 1}`,
      scope: "business",
      source: "system",
      guide: "inail-filing",
    });
  }

  // The 50% INPS reduction lasts 36 months from the start: remind to ask for the
  // 35% forfettari reduction in time, on 28 February of the year it ends.
  if (profile.inpsReduction50NewEnrollmentActive && profile.inpsReduction35Active) {
    const start = new Date(`${profile.activityStartDate}T00:00:00Z`);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 36, 1));
    if (end.getUTCFullYear() === year) {
      items.push({
        key: `filing:inps35:${year}`,
        dueDate: shiftToBusinessDay(onDay(year, 2, 28)),
        title: "Riduzione INPS: passaggio dal 50% al 35%",
        scope: "business",
        source: "system",
        guide: "inps35",
        note: `La riduzione del 50% finisce a ${new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(end.getTime() - 86_400_000))}.`,
      });
    }
  }
  return items;
}

/** Occurrences of a reminder between two ISO dates (inclusive). */
export function expandReminder(r: Reminder, from: string, to: string): TaskItem[] {
  const [fy, fm, fd] = r.firstDue.split("-").map(Number);
  const make = (due: string): TaskItem => ({
    key: `reminder:${r.id}:${due}`,
    dueDate: due,
    title: r.title,
    scope: r.scope,
    source: "custom",
    amount: r.amount,
    note: r.notes,
    reminderId: r.id,
  });

  if (r.recurrence === "once") return r.firstDue >= from && r.firstDue <= to ? [make(r.firstDue)] : [];

  const out: TaskItem[] = [];
  if (r.recurrence === "yearly") {
    for (let y = Math.max(fy, yearOf(from)); y <= yearOf(to); y++) {
      const due = onDay(y, fm, fd);
      if (due >= r.firstDue && due >= from && due <= to) out.push(make(due));
    }
    return out;
  }
  // monthly
  let y = fy;
  let m = fm;
  for (let i = 0; i < 600; i++) {
    const due = onDay(y, m, fd);
    if (due > to) break;
    if (due >= from) out.push(make(due));
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

const longDate = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/** Short "how to" for a task, shown before marking it as done. */
export function taskGuide(t: TaskItem): string[] {
  switch (t.guide) {
    case "redditi":
      return [
        `Se te la prepara un commercialista o un servizio, controlla i dati e autorizza l'invio entro il ${longDate(t.dueDate)}.`,
        "Con la partita IVA in regime forfettario serve il Modello Redditi PF, non il 730: comprende anche gli altri redditi (es. lavoro dipendente).",
        "Quando è inviata, carica la ricevuta di presentazione dell'Agenzia delle Entrate e segnala come fatta.",
      ];
    case "inail-filing":
      return [
        `In MyINAIL → Autoliquidazione → Alpi online, dopo aver calcolato il premio premi "Trasmetti": invii la dichiarazione delle retribuzioni entro il ${longDate(t.dueDate)}.`,
        "Se l'hai già trasmessa insieme al pagamento del premio di febbraio, basta segnarla come fatta.",
      ];
    case "inps35":
      return [
        `${t.note ?? ""} Per continuare con lo sconto del 35% riservato ai forfettari serve una domanda a INPS (Cassetto previdenziale artigiani e commercianti, sezione domande).`,
        "Chiedi a un patronato o al commercialista i tempi esatti: sul passaggio diretto dal 50% al 35% le indicazioni non sono univoche.",
      ];
    default:
      return t.note ? [t.note] : [];
  }
}

/** Filings and reminders between two dates, sorted by date. */
export function buildTasks(args: {
  from: string;
  to: string;
  profile: FiscalProfile;
  reminders: Reminder[];
  inail: boolean;
}): TaskItem[] {
  const items: TaskItem[] = [];
  for (let y = yearOf(args.from); y <= yearOf(args.to); y++) {
    items.push(...buildFilings(y, args.profile, { inail: args.inail }).filter((t) => t.dueDate >= args.from && t.dueDate <= args.to));
  }
  for (const r of args.reminders) items.push(...expandReminder(r, args.from, args.to));
  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
}
