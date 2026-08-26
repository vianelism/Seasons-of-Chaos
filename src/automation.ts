import type { AutomationKind, DiscordMessage } from "./cloudflare-types.js";
import { D1PassportRepository } from "./d1-repository.js";
import type { Reward, StampDefinition } from "./types.js";

const API = "https://discord.com/api/v10";

export async function discordRequest(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bot ${env.DISCORD_TOKEN}`, "Content-Type": "application/json", ...init.headers } });
  if (!response.ok) throw new Error(`Discord API ${response.status} for ${path}`);
  return response;
}

export function automaticSlugs(kind: AutomationKind, message: DiscordMessage): string[] {
  const month = message.timestamp.slice(0, 7);
  const slugs: string[] = [];
  if (kind === "seasonal") {
    if (month === "2026-09") slugs.push("fall-girl-era");
    if (month === "2026-10") slugs.push("spooky-bitch");
    if (month === "2026-11") slugs.push("stuffed-and-surviving");
  }
  if (kind === "photos" && (message.attachments?.length ?? 0) > 0 && month >= "2026-09" && month <= "2026-11") slugs.push("pics-or-it-didnt-happen");
  if (kind === "movie-night") slugs.push("roll-the-credits", ...(month === "2026-10" ? ["boo-crew"] : []));
  if (kind === "game-night") slugs.push("game-on");
  return slugs;
}

export function secretActivitySlugs(month: string, monthDays: number, activeMonths: number): string[] {
  const slugs: string[] = [];
  if (month === "2026-10" && monthDays >= 3) slugs.push("witch-please");
  if (month === "2026-10" && monthDays >= 5) slugs.push("goblin-mode");
  if (month === "2026-11" && monthDays >= 3) slugs.push("left-no-crumbs");
  if (activeMonths >= 3) slugs.push("i-was-here");
  return slugs;
}

async function announceStamp(env: Env, channelId: string, userId: string, stamp: StampDefinition): Promise<void> {
  await discordRequest(env, `/channels/${channelId}/messages`, { method: "POST", body: JSON.stringify({ content: `**STAMP EARNED 🎉**\n${stamp.emoji} <@${userId}> earned **${stamp.name}**!\n*${stamp.announcement || "The passport office has approved this nonsense."}*` }) });
}

export async function assignRewardRole(env: Env, guildId: string, userId: string, reward: Reward): Promise<void> {
  if (reward.roleRewardId) await discordRequest(env, `/guilds/${guildId}/members/${userId}/roles/${reward.roleRewardId}`, { method: "PUT" });
}

async function announceReward(env: Env, guildId: string, channelId: string, userId: string, reward: Reward): Promise<void> {
  await assignRewardRole(env, guildId, userId, reward);
  await discordRequest(env, `/channels/${channelId}/messages`, { method: "POST", body: JSON.stringify({ content: `**REWARD UNLOCKED 🎁**\n${reward.emoji} <@${userId}> unlocked **${reward.name}**!\n*Mom chaos recognized. Completely prestigious.*` }) });
}

async function processMessage(env: Env, repository: D1PassportRepository, guildId: string, kind: AutomationKind, announcementChannelId: string, item: DiscordMessage): Promise<number> {
  if (item.author.bot) return 0;
  let awarded = 0;
  const activity = await repository.recordActivityDay(guildId, item.author.id, item.timestamp);
  const slugs = automaticSlugs(kind, item);
  const month = item.timestamp.slice(0, 7);
  slugs.push(...secretActivitySlugs(month, activity.monthDays, activity.activeMonths));
  for (const slug of [...new Set(slugs)]) {
    const stamp = await repository.findActiveStamp(slug);
    if (!stamp) continue;
    const created = await repository.award(guildId, item.author.id, item.member?.nick || item.author.global_name || item.author.username, slug, "automation");
    if (created) { awarded += 1; await announceStamp(env, announcementChannelId, item.author.id, stamp); }
  }
  for (const reward of await repository.claimUnlockedRewards(guildId, item.author.id)) await announceReward(env, guildId, announcementChannelId, item.author.id, reward);
  return awarded;
}

export async function runAutomation(env: Env): Promise<void> {
  if (!env.DISCORD_TOKEN) throw new Error("DISCORD_TOKEN is required for automatic tracking");
  const repository = new D1PassportRepository(env.DB);
  const channels = await repository.listAutomationChannels();
  const announcementByGuild = new Map(channels.filter((row) => row.kind === "seasonal").map((row) => [row.guild_id, row.channel_id]));
  let awards = 0;
  for (const channel of channels) {
    if (!channel.last_message_id) {
      try {
        const baselineResponse = await discordRequest(env, `/channels/${channel.channel_id}/messages?limit=1`);
        const baseline = (await baselineResponse.json()) as DiscordMessage[];
        if (baseline[0]) await repository.updateChannelCursor(channel.guild_id, channel.kind, baseline[0].id);
      } catch (error) {
        console.error(JSON.stringify({ event: "automation_channel_failed", guildId: channel.guild_id, kind: channel.kind, error: error instanceof Error ? error.message : String(error) }));
      }
      continue;
    }
    try {
      const query = new URLSearchParams({ limit: "100", after: channel.last_message_id });
      const response = await discordRequest(env, `/channels/${channel.channel_id}/messages?${query}`);
      const messages = (await response.json()) as DiscordMessage[];
      messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      for (const item of messages) awards += await processMessage(env, repository, channel.guild_id, channel.kind, announcementByGuild.get(channel.guild_id) || channel.channel_id, item);
      const newest = messages.at(-1);
      if (newest) await repository.updateChannelCursor(channel.guild_id, channel.kind, newest.id);
    } catch (error) {
      console.error(JSON.stringify({ event: "automation_channel_failed", guildId: channel.guild_id, kind: channel.kind, error: error instanceof Error ? error.message : String(error) }));
    }
  }
  console.log(JSON.stringify({ event: "automation_complete", channels: channels.length, awards }));
}
