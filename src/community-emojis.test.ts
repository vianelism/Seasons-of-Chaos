import { describe, expect, it } from "vitest";
import { COMMUNITY_EMOJI_NAMES, COMMUNITY_EMOTE_GROUPS, communityEmoji, communityEmojiId } from "./community-emojis.js";

describe("communityEmoji", () => {
  it("uses an uploaded Discord emoji mention when available", () => {
    const emojis = new Map([["chaos", "<:chaos:123>"]]);
    expect(communityEmoji(emojis, "chaos", "✨")).toBe("<:chaos:123>");
  });

  it("keeps a Unicode fallback while an emoji is still being uploaded", () => {
    expect(communityEmoji(new Map(), "chaos", "✨")).toBe("✨");
  });

  it("extracts static and animated application emoji IDs for server imports", () => {
    expect(communityEmojiId(new Map([["chaos", "<:chaos:123>"]]), "chaos")).toBe("123");
    expect(communityEmojiId(new Map([["chaos", "<a:chaos:456>"]]), "chaos")).toBe("456");
    expect(communityEmojiId(new Map(), "chaos")).toBeUndefined();
  });

  it("keeps all 30 planned names unique for command autocomplete", () => {
    expect(COMMUNITY_EMOJI_NAMES).toHaveLength(30);
    expect(new Set(COMMUNITY_EMOJI_NAMES).size).toBe(30);
  });

  it("organizes every emote into one drawer group", () => {
    const grouped = COMMUNITY_EMOTE_GROUPS.flatMap((group) => group.emotes);
    expect(grouped).toHaveLength(30);
    expect(new Set(grouped)).toEqual(new Set(COMMUNITY_EMOJI_NAMES));
  });
});
