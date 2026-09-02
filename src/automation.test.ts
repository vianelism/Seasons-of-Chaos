import { describe, expect, it } from "vitest";
import { automaticSlugs, pollWinners, secretActivitySlugs, stampAnnouncementContent } from "./automation.js";
import type { StampDefinition } from "./types.js";
import type { DiscordMessage } from "./cloudflare-types.js";

function message(timestamp: string, attachments = 0): DiscordMessage {
  return {
    id: "1", channel_id: "2", timestamp,
    author: { id: "3", username: "mom" },
    attachments: Array.from({ length: attachments }, (_, index) => ({ id: String(index) })),
  };
}

describe("Fall 2026 automatic stamps", () => {
  it.each([
    ["2026-09-10T12:00:00.000Z", "fall-girl-era"],
    ["2026-10-10T12:00:00.000Z", "spooky-bitch"],
    ["2026-11-10T12:00:00.000Z", "stuffed-and-surviving"],
  ])("awards the monthly participation stamp for %s", (timestamp, slug) => {
    expect(automaticSlugs("seasonal", message(timestamp))).toContain(slug);
  });

  it("only awards the Fall photo stamp for an attachment during the season", () => {
    expect(automaticSlugs("photos", message("2026-09-10T12:00:00.000Z", 1))).toEqual(["pics-or-it-didnt-happen"]);
    expect(automaticSlugs("photos", message("2026-09-10T12:00:00.000Z"))).toEqual([]);
    expect(automaticSlugs("photos", message("2026-12-10T12:00:00.000Z", 1))).toEqual([]);
  });

  it("awards movie and game participation", () => {
    expect(automaticSlugs("movie-night", message("2026-10-10T12:00:00.000Z"))).toEqual(["roll-the-credits", "boo-crew"]);
    expect(automaticSlugs("game-night", message("2026-10-10T12:00:00.000Z"))).toEqual(["game-on"]);
  });

  it("unlocks secret stamps on distinct-day and cross-month milestones", () => {
    expect(secretActivitySlugs("2026-10", 3, 1)).toEqual(["witch-please"]);
    expect(secretActivitySlugs("2026-10", 5, 1)).toEqual(["witch-please", "goblin-mode"]);
    expect(secretActivitySlugs("2026-11", 3, 3)).toEqual(["left-no-crumbs", "i-was-here"]);
  });

  it("preserves tied poll winners and handles finalized polls without votes", () => {
    const pollMessage = message("2026-10-18T12:00:00.000Z");
    pollMessage.poll = {
      question: { text: "Which date?" }, expiry: "2026-10-18T12:00:00.000Z",
      answers: [
        { answer_id: 4, poll_media: { text: "Friday" } },
        { answer_id: 8, poll_media: { text: "Saturday" } },
        { answer_id: 12, poll_media: { text: "Sunday" } },
      ],
      results: { is_finalized: true, answer_counts: [{ id: 4, count: 3 }, { id: 8, count: 3 }, { id: 12, count: 1 }] },
    };
    expect(pollWinners(pollMessage)).toEqual({ winners: ["Friday", "Saturday"], votes: 3 });
    pollMessage.poll.results = { is_finalized: true, answer_counts: [] };
    expect(pollWinners(pollMessage)).toEqual({ winners: [], votes: 0 });
  });

  it("combines recipients of the same automatic stamp into one announcement", () => {
    const stamp: StampDefinition = { slug: "fall-girl-era", name: "Fall Girl Era", emoji: "🍂", description: "Joined the kickoff.", category: "Fall", secret: false, active: true };
    const content = stampAnnouncementContent(stamp, ["101", "202", "101", "303"], new Map());
    expect(content).toContain("<@101>, <@202>, and <@303> earned **Fall Girl Era**!");
    expect(content.match(/STAMP EARNED/g)).toHaveLength(1);
  });

  it("keeps a natural one-person automatic stamp announcement", () => {
    const stamp: StampDefinition = { slug: "game-on", name: "Game On", emoji: "🎮", description: "Joined game night.", category: "Events", secret: false, active: true };
    expect(stampAnnouncementContent(stamp, ["101"], new Map())).toContain("<@101> earned **Game On**!");
  });
});
