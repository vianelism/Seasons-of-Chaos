interface GuildEmoji {
  id: string;
  name: string | null;
  animated?: boolean;
  available?: boolean;
}

export type CommunityEmojiMap = ReadonlyMap<string, string>;

export const COMMUNITY_EMOJI_NAMES = [
  "chaos", "momfuel", "caffeinate", "omgyes", "passport", "stampearned",
  "done", "imfine", "lurking", "justwatching", "yapping", "girlpls",
  "bet", "nope", "dead", "receipts", "waiting", "chaosapproved",
  "passportchaos", "secretunlocked", "excuse", "absolutelynot", "sendhelp",
  "hereforthedrama", "survived", "gotyou", "overit", "cozy", "chaoscrew",
  "caffeinechaos",
] as const;

export const COMMUNITY_EMOTE_GROUPS = [
  { name: "✨ Essentials", emotes: ["chaos", "momfuel", "caffeinate", "omgyes", "passport", "stampearned"] },
  { name: "💬 Mood Check", emotes: ["done", "imfine", "lurking", "justwatching", "yapping", "girlpls"] },
  { name: "👀 Reactions", emotes: ["bet", "nope", "dead", "receipts", "waiting", "chaosapproved"] },
  { name: "🎭 Maximum Drama", emotes: ["passportchaos", "secretunlocked", "excuse", "absolutelynot", "sendhelp", "hereforthedrama"] },
  { name: "☕ Survival Kit", emotes: ["survived", "gotyou", "overit", "cozy", "chaoscrew", "caffeinechaos"] },
] as const;

export async function fetchCommunityEmojis(env: Env, guildId: string): Promise<CommunityEmojiMap> {
  try {
    const response = await fetch(`https://discord.com/api/v10/applications/${env.DISCORD_CLIENT_ID}/emojis`, {
      headers: { Authorization: `Bot ${env.DISCORD_TOKEN}` },
    });
    if (!response.ok) return new Map();
    const body = (await response.json()) as { items?: GuildEmoji[] };
    const items = body.items ?? [];
    return new Map(items.filter((item) => item.name && item.available !== false).map((item) => [item.name!, `<${item.animated ? "a" : ""}:${item.name}:${item.id}>`]));
  } catch (error) {
    console.error(JSON.stringify({ event: "community_emoji_lookup_failed", guildId, error: error instanceof Error ? error.message : String(error) }));
    return new Map();
  }
}

export function communityEmoji(emojis: CommunityEmojiMap, name: string, fallback: string): string {
  return emojis.get(name) ?? fallback;
}
