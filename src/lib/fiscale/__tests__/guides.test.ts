import { describe, expect, it } from "vitest";
import { GUIDE_MEDIA_SLOTS, guideFor } from "../guides";
import { buildF24Schedule, type F24Item } from "../tax-calculator";

const items: F24Item[] = [2026, 2027].flatMap((y) =>
  buildF24Schedule({
    calendarYear: y,
    figures: { 2025: { grossRevenue: 2_000_000, inpsDeducted: 0 }, 2026: { grossRevenue: 4_000_000, inpsDeducted: 300_000 } },
    stampDutyByQuarter: { 2025: [0, 0, 0, 400], 2026: [600_000, 0, 200, 200] },
    inail: { lastPremium: 9_726 },
  }),
);
const text = (item: F24Item) => guideFor(item).steps.flatMap((s) => [s.title, ...s.body]).join(" ");

describe("payment guides", () => {
  it("has a guide with steps for every kind of deadline", () => {
    const categories = new Set(items.map((i) => i.category));
    expect(categories.size).toBe(6);
    for (const item of items) expect(guideFor(item).steps.length, item.key).toBeGreaterThan(0);
  });

  it("fills in the data of the specific deadline", () => {
    const fixed = items.find((i) => i.key === "inps:fixed_q2:2026")!;
    expect(text(fixed)).toContain("20 agosto 2026");
    const tax = items.find((i) => i.key === "tax:advance_2:2026")!;
    expect(text(tax)).toContain("Codice tributo: 1791");
    const stamp = items.find((i) => i.key === "stamp:q3:2026")!;
    expect(text(stamp)).toContain("3° trimestre");
    expect(text(items.find((i) => i.category === "chamber_fee")!)).toContain("3850");
    const inail2027 = items.find((i) => i.key === "inail:2027")!;
    expect(text(inail2027)).toContain("16 febbraio 2027");
    expect(text(inail2027)).toContain("28 febbraio 2027");
  });

  it("only uses known media slots (INPS and bollo have the owner's images/videos)", () => {
    const used = new Set(items.flatMap((i) => guideFor(i).steps.map((s) => s.media).filter(Boolean)));
    for (const slot of used) expect(GUIDE_MEDIA_SLOTS).toContain(slot);
    expect(guideFor(items.find((i) => i.category === "inps_fixed")!).steps.map((s) => s.media)).toEqual(["inps-1", "inps-2", "inps-3"]);
    expect(guideFor(items.find((i) => i.category === "stamp_duty")!).steps.map((s) => s.media)).toEqual(["bollo-1", "bollo-2", "bollo-3"]);
    expect(guideFor(items.find((i) => i.category === "inail")!).steps.map((s) => s.media)).toEqual(["inail-1", "inail-2", "inail-3", "inail-4"]);
  });
});
