import { describe, expect, it } from "vitest";
import { customPollAnswers, localEventTime } from "./event-tools.js";

describe("custom event tools", () => {
  it("converts Eastern local event time across daylight saving time", () => {
    expect(localEventTime("2026-10-10", "19:30", "eastern")?.toISOString()).toBe("2026-10-10T23:30:00.000Z");
    expect(localEventTime("2026-12-10", "19:30", "eastern")?.toISOString()).toBe("2026-12-11T00:30:00.000Z");
  });

  it("rejects impossible dates and missing daylight-saving times", () => {
    expect(localEventTime("2026-02-30", "19:00", "eastern")).toBeUndefined();
    expect(localEventTime("2027-03-14", "02:30", "eastern")).toBeUndefined();
  });

  it("parses two to ten pipe-separated poll answers", () => {
    expect(customPollAnswers("Movie | Game | Either works")).toEqual(["Movie", "Game", "Either works"]);
    expect(customPollAnswers("Only one")).toBeUndefined();
    expect(customPollAnswers("")).toEqual([]);
  });
});
