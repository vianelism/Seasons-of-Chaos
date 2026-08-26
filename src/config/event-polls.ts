import type { AutomationKind } from "../cloudflare-types.js";

export type ScheduledEventPoll = {
  id: string;
  name: string;
  emoji: string;
  kind: Extract<AutomationKind, "movie-night" | "game-night">;
  datePollAt: string;
  dateOptions: readonly string[];
};

export const EVENT_POLLS: readonly ScheduledEventPoll[] = [
  {
    id: "halloween-movie-2026",
    name: "Halloween Movie Night",
    emoji: "🎃",
    kind: "movie-night",
    datePollAt: "2026-10-15T16:00:00.000Z",
    dateOptions: ["Fri, Oct 23", "Sat, Oct 24", "Sun, Oct 25", "Async watch-along only"],
  },
  {
    id: "holiday-movie-2026",
    name: "Holiday Movie Night",
    emoji: "🎄",
    kind: "movie-night",
    datePollAt: "2026-12-04T17:00:00.000Z",
    dateOptions: ["Fri, Dec 11", "Sat, Dec 12", "Sun, Dec 13", "Async watch-along only"],
  },
  {
    id: "winter-game-2027",
    name: "We Survived Game Night",
    emoji: "🎮",
    kind: "game-night",
    datePollAt: "2027-01-03T17:00:00.000Z",
    dateOptions: ["Fri, Jan 8", "Sat, Jan 9", "Sun, Jan 10", "Async game only"],
  },
];

export const EVENT_TIME_OPTIONS = ["2 PM ET", "6 PM ET", "8 PM ET", "9 PM ET", "Async / cannot make it live"] as const;
