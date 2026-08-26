import { describe, expect, it } from "vitest";
import { FALL_2026_ACTIVITIES } from "./fall-2026-activities.js";

describe("Fall Into Chaos activity schedule", () => {
  it("contains unique, chronological activities from September through January", () => {
    expect(FALL_2026_ACTIVITIES).toHaveLength(66);
    expect(new Set(FALL_2026_ACTIVITIES.map((activity) => activity.id)).size).toBe(66);
    expect(FALL_2026_ACTIVITIES[0]?.scheduledAt.startsWith("2026-09")).toBe(true);
    expect(FALL_2026_ACTIVITIES.at(-1)?.scheduledAt.startsWith("2027-01")).toBe(true);
    expect(FALL_2026_ACTIVITIES.map((activity) => activity.scheduledAt)).toEqual([...FALL_2026_ACTIVITIES].map((activity) => activity.scheduledAt).sort());
  });

  it("includes every day of Halloween and all 12 Days of Discord", () => {
    expect(FALL_2026_ACTIVITIES.filter((activity) => activity.id.startsWith("oct-"))).toHaveLength(31);
    expect(FALL_2026_ACTIVITIES.filter((activity) => activity.id.startsWith("dec-day-"))).toHaveLength(12);
  });
});
