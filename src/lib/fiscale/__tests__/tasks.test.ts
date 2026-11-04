import { describe, expect, it } from "vitest";
import { buildFilings, buildTasks, expandReminder, type Reminder } from "../tasks";
import { DEFAULT_PROFILE } from "../tax-config";

const profile = {
  ...DEFAULT_PROFILE,
  activityStartDate: "2025-11-06",
  inpsReduction50NewEnrollmentActive: true,
  inpsReduction35Active: true,
};

describe("filings", () => {
  it("starts the year after the activity start, shifting weekend deadlines", () => {
    expect(buildFilings(2025, profile, { inail: true })).toEqual([]);
    const y2026 = Object.fromEntries(buildFilings(2026, profile, { inail: true }).map((t) => [t.key, t.dueDate]));
    expect(y2026["filing:redditi:2026"]).toBe("2026-11-02"); // 31/10 Saturday, 1/11 Sunday and holiday
    expect(y2026["filing:inail:2026"]).toBe("2026-03-02"); // 28/2 Saturday
    expect(buildFilings(2027, profile, { inail: false }).map((t) => t.key)).toEqual(["filing:redditi:2027"]);
  });

  it("reminds the 35% INPS reduction in the year the 50% ends", () => {
    expect(buildFilings(2027, profile, { inail: true }).some((t) => t.key.startsWith("filing:inps35"))).toBe(false);
    const t = buildFilings(2028, profile, { inail: true }).find((x) => x.key === "filing:inps35:2028");
    expect(t?.dueDate).toBe("2028-02-28");
    expect(t?.note).toContain("ottobre 2028");
  });
});

describe("reminders", () => {
  const base: Reminder = { id: "r1", title: "IMU", scope: "personal", firstDue: "2026-06-16", recurrence: "yearly", amount: 30_000, notes: null };

  it("repeats yearly from the first date", () => {
    expect(expandReminder(base, "2026-01-01", "2027-12-31").map((t) => t.dueDate)).toEqual(["2026-06-16", "2027-06-16"]);
    expect(expandReminder(base, "2025-01-01", "2025-12-31")).toEqual([]);
  });

  it("clamps monthly reminders to the month end", () => {
    const monthly = { ...base, recurrence: "monthly" as const, firstDue: "2026-01-31" };
    expect(expandReminder(monthly, "2026-01-01", "2026-04-30").map((t) => t.dueDate)).toEqual([
      "2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30",
    ]);
  });

  it("keeps one-off reminders only inside the range", () => {
    const once = { ...base, recurrence: "once" as const };
    expect(expandReminder(once, "2026-01-01", "2026-12-31")).toHaveLength(1);
    expect(expandReminder(once, "2026-07-01", "2026-12-31")).toHaveLength(0);
  });

  it("merges filings and reminders by date with stable keys", () => {
    const tasks = buildTasks({ from: "2026-01-01", to: "2026-12-31", profile, reminders: [base], inail: true });
    expect(tasks.map((t) => t.key)).toEqual(["filing:inail:2026", "reminder:r1:2026-06-16", "filing:redditi:2026"]);
    for (const t of tasks) expect(t.key).toMatch(/^[a-z0-9_:-]{3,120}$/);
  });
});
