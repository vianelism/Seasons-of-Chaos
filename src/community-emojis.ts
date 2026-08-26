interface GuildEmoji {
  id: string;
  name: string | null;
  animated?: boolean;
  available?: boolean;
}

export type CommunityEmojiMap = ReadonlyMap<string, string>;

export async function fetchCommunityEmojis(env: Env, guildId: string): Promise<CommunityEmojiMap> {
  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis`, {
      headers: { Authorization: `Bot ${env.DISCORD_TOKEN}` },
    });
    if (!response.ok) return new Map();
    const items = (await response.json()) as GuildEmoji[];
    return new Map(items.filter((item) => item.name && item.available !== false).map((item) => [item.name!, `<${item.animated ? "a" : ""}:${item.name}:${item.id}>`]));
  } catch (error) {
    console.error(JSON.stringify({ event: "community_emoji_lookup_failed", guildId, error: error instanceof Error ? error.message : String(error) }));
    return new Map();
  }
}

export function communityEmoji(emojis: CommunityEmojiMap, name: string, fallback: string): string {
  return emojis.get(name) ?? fallback;
}
