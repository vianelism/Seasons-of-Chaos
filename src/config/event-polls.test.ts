import { describe, expect, it } from "vitest";
import { EVENT_POLLS, EVENT_TIME_OPTIONS } from "./event-polls.js";

describe("event poll schedule", () => {
  it("plans Halloween, holiday, and winter events in chronological order", () => {
    expect(EVENT_POLLS.map((event) => event.id)).toEqual(["halloween-movie-2026", "holiday-movie-2026", "winter-game-2027"]);
    expect(EVENT_POLLS.map((event) => event.datePollAt)).toEqual([...EVENT_POLLS].map((event) => event.datePollAt).sort());
  });

  it("offers multiple dates, times, and an asynchronous option", () => {
    for (const event of EVENT_POLLS) {
      expect(event.dateOptions.length).toBeGreaterThanOrEqual(4);
      expect(event.dateOptions.some((answer) => answer.includes("Async"))).toBe(true);
    }
    expect(EVENT_TIME_OPTIONS.some((answer) => answer.includes("Async"))).toBe(true);
  });
});
