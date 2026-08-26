import { describe, expect, it } from "vitest";
import { COMMUNITY_EMOJI_NAMES, communityEmoji } from "./community-emojis.js";

describe("communityEmoji", () => {
  it("uses an uploaded Discord emoji mention when available", () => {
    const emojis = new Map([["chaos", "<:chaos:123>"]]);
    expect(communityEmoji(emojis, "chaos", "✨")).toBe("<:chaos:123>");
  });

  it("keeps a Unicode fallback while an emoji is still being uploaded", () => {
    expect(communityEmoji(new Map(), "chaos", "✨")).toBe("✨");
  });

  it("keeps all 30 planned names unique for command autocomplete", () => {
    expect(COMMUNITY_EMOJI_NAMES).toHaveLength(30);
    expect(new Set(COMMUNITY_EMOJI_NAMES).size).toBe(30);
  });
});
