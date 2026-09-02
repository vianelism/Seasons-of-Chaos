import type { AutomationKind, DiscordMessage } from "./cloudflare-types.js";
import { D1PassportRepository } from "./d1-repository.js";
import type { Reward, StampDefinition } from "./types.js";
import { communityEmoji, fetchCommunityEmojis, type CommunityEmojiMap } from "./community-emojis.js";
import { FALL_2026_ACTIVITIES } from "./config/fall-2026-activities.js";
import { EVENT_POLLS, EVENT_TIME_OPTIONS, type ScheduledEventPoll } from "./config/event-polls.js";

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

type PendingStampAnnouncement = {
  channelId: string;
  stamp: StampDefinition;
  userIds: Set<string>;
  emojis: CommunityEmojiMap;
};

function mentionList(userIds: readonly string[]): string {
  const mentions = userIds.map((userId) => `<@${userId}>`);
  if (mentions.length <= 1) return mentions[0] ?? "Someone";
  if (mentions.length === 2) return `${mentions[0]} and ${mentions[1]}`;
  return `${mentions.slice(0, -1).join(", ")}, and ${mentions.at(-1)}`;
}

export function stampAnnouncementContent(stamp: StampDefinition, userIds: readonly string[], emojis: CommunityEmojiMap): string {
  const recipients = [...new Set(userIds)];
  return `**STAMP EARNED ${communityEmoji(emojis, "stampearned", "🎉")}**\n${stamp.emoji} ${mentionList(recipients)} earned **${stamp.name}**!\n*${communityEmoji(emojis, "chaosapproved", "✅")} ${stamp.announcement || "The passport office has approved this nonsense."}*`;
}

async function announceStamp(env: Env, announcement: PendingStampAnnouncement): Promise<void> {
  await discordRequest(env, `/channels/${announcement.channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content: stampAnnouncementContent(announcement.stamp, [...announcement.userIds], announcement.emojis) }),
  });
}

export async function assignRewardRole(env: Env, guildId: string, userId: string, reward: Reward): Promise<void> {
  if (reward.roleRewardId) await discordRequest(env, `/guilds/${guildId}/members/${userId}/roles/${reward.roleRewardId}`, { method: "PUT" });
}

async function announceReward(env: Env, guildId: string, channelId: string, userId: string, reward: Reward, emojis: CommunityEmojiMap): Promise<void> {
  await assignRewardRole(env, guildId, userId, reward);
  await discordRequest(env, `/channels/${channelId}/messages`, { method: "POST", body: JSON.stringify({ content: `**REWARD UNLOCKED ${communityEmoji(emojis, "secretunlocked", "🎁")}**\n${reward.emoji} <@${userId}> unlocked **${reward.name}**!\n*${communityEmoji(emojis, "chaos", "✨")} Mom chaos recognized. Completely prestigious.*` }) });
}

async function processMessage(env: Env, repository: D1PassportRepository, guildId: string, kind: AutomationKind, announcementChannelId: string, item: DiscordMessage, emojis: CommunityEmojiMap, announcements: Map<string, PendingStampAnnouncement>): Promise<number> {
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
    if (created) {
      awarded += 1;
      const key = `${announcementChannelId}:${stamp.slug}`;
      const pending = announcements.get(key) ?? { channelId: announcementChannelId, stamp, userIds: new Set<string>(), emojis };
      pending.userIds.add(item.author.id);
      announcements.set(key, pending);
    }
  }
  for (const reward of await repository.claimUnlockedRewards(guildId, item.author.id)) await announceReward(env, guildId, announcementChannelId, item.author.id, reward, emojis);
  return awarded;
}

function pollPayload(question: string, answers: readonly string[], duration: number): object {
  return {
    poll: {
      question: { text: question },
      answers: answers.map((text) => ({ poll_media: { text } })),
      duration,
      allow_multiselect: true,
      layout_type: 1,
    },
    allowed_mentions: { parse: [] },
  };
}

export function pollWinners(message: DiscordMessage): { winners: string[]; votes: number } | undefined {
  const poll = message.poll;
  if (!poll?.results?.is_finalized) return undefined;
  const counts = new Map(poll.results.answer_counts.map((answer) => [answer.id, answer.count]));
  const votes = Math.max(0, ...counts.values());
  if (votes === 0) return { winners: [], votes: 0 };
  return { winners: poll.answers.filter((answer) => (counts.get(answer.answer_id) ?? 0) === votes).map((answer) => answer.poll_media.text).filter((text): text is string => Boolean(text)), votes };
}

async function postDatePoll(env: Env, repository: D1PassportRepository, guildId: string, channelId: string, event: ScheduledEventPoll): Promise<void> {
  const response = await discordRequest(env, `/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: `**${event.emoji} Let's plan ${event.name}!**\nSelect **every date that works**. There is no pressure to attend live; the asynchronous option is completely valid.`,
      ...pollPayload(`Which date(s) work for ${event.name}?`, event.dateOptions, 72),
    }),
  });
  const message = (await response.json()) as DiscordMessage;
  await repository.createEventPollRun(guildId, event.id, channelId, message.id, message.poll?.expiry || new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString());
}

async function advanceEventPoll(env: Env, repository: D1PassportRepository, guildId: string, event: ScheduledEventPoll): Promise<void> {
  const run = await repository.findEventPollRun(guildId, event.id);
  if (!run || run.completed_at) return;
  const now = new Date().toISOString();
  if (!run.time_message_id && run.date_poll_expires_at <= now) {
    const response = await discordRequest(env, `/channels/${run.channel_id}/messages/${run.date_message_id}`);
    const dateMessage = (await response.json()) as DiscordMessage;
    const result = pollWinners(dateMessage);
    if (!result) return;
    const liveDates = result.winners.filter((answer) => !answer.toLowerCase().includes("async"));
    if (result.votes === 0 || liveDates.length === 0) {
      await discordRequest(env, `/channels/${run.channel_id}/messages`, { method: "POST", body: JSON.stringify({ content: `**${event.emoji} ${event.name} update**\nNo live date won the poll, so this stays asynchronous and gloriously low-pressure. Share recommendations or join whenever works.`, allowed_mentions: { parse: [] } }) });
      await repository.completeEventPoll(guildId, event.id);
      return;
    }
    const selectedLabel = liveDates.join(" or ");
    const timeResponse = await discordRequest(env, `/channels/${run.channel_id}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: `**${event.emoji} ${event.name}: time check**\nThe leading date${liveDates.length === 1 ? " is" : "s are tied: "} **${selectedLabel}**. Select every time that could work for you.`,
        ...pollPayload(`What time works on ${selectedLabel}?`, EVENT_TIME_OPTIONS, 48),
      }),
    });
    const timeMessage = (await timeResponse.json()) as DiscordMessage;
    await repository.recordTimePoll(guildId, event.id, liveDates, timeMessage.id, timeMessage.poll?.expiry || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString());
    return;
  }
  if (run.time_message_id && run.time_poll_expires_at && run.time_poll_expires_at <= now) {
    const response = await discordRequest(env, `/channels/${run.channel_id}/messages/${run.time_message_id}`);
    const timeMessage = (await response.json()) as DiscordMessage;
    const result = pollWinners(timeMessage);
    if (!result) return;
    const selectedDates = run.selected_dates ? (JSON.parse(run.selected_dates) as string[]) : [];
    const answer = result.winners.length ? result.winners.join(" or ") : "no single live time";
    await discordRequest(env, `/channels/${run.channel_id}/messages`, { method: "POST", body: JSON.stringify({ content: `**${event.emoji} ${event.name} poll result**\nBest date${selectedDates.length === 1 ? "" : "s"}: **${selectedDates.join(" or ") || "asynchronous"}**\nBest time: **${answer}**\n\nThis is a suggestion, not a summons. Adjust in the replies if real life changes the plan.`, allowed_mentions: { parse: [] } }) });
    await repository.completeEventPoll(guildId, event.id);
  }
}

async function runEventPolls(env: Env, repository: D1PassportRepository, channels: Awaited<ReturnType<D1PassportRepository["listAutomationChannels"]>>): Promise<number> {
  let updates = 0;
  const now = new Date().toISOString();
  for (const guildId of new Set(channels.map((channel) => channel.guild_id))) {
    for (const event of EVENT_POLLS) {
      const channel = channels.find((item) => item.guild_id === guildId && item.kind === event.kind);
      if (!channel || event.datePollAt < channel.configured_at) continue;
      try {
        const existing = await repository.findEventPollRun(guildId, event.id);
        if (!existing && event.datePollAt <= now) {
          await postDatePoll(env, repository, guildId, channel.channel_id, event);
          updates += 1;
        } else if (existing && !existing.completed_at) {
          await advanceEventPoll(env, repository, guildId, event);
          updates += 1;
        }
      } catch (error) {
        console.error(JSON.stringify({ event: "event_poll_failed", guildId, eventId: event.id, error: error instanceof Error ? error.message : String(error) }));
      }
    }
  }
  return updates;
}

export async function runAutomation(env: Env): Promise<void> {
  if (!env.DISCORD_TOKEN) throw new Error("DISCORD_TOKEN is required for automatic tracking");
  const repository = new D1PassportRepository(env.DB);
  const channels = await repository.listAutomationChannels();
  const pollUpdates = await runEventPolls(env, repository, channels);
  let activityPosts = 0;
  const now = new Date().toISOString();
  for (const channel of channels.filter((row) => row.kind === "activities")) {
    const due = FALL_2026_ACTIVITIES.filter((activity) => activity.scheduledAt >= channel.configured_at && activity.scheduledAt <= now);
    for (const activity of due) {
      if (await repository.hasActivityPost(channel.guild_id, activity.id)) continue;
      try {
        await discordRequest(env, `/channels/${channel.channel_id}/messages`, { method: "POST", body: JSON.stringify({
          content: `**${activity.title}**\n${activity.body}\n\n*No pressure. Answer whenever—or simply enjoy the chaos.*`,
          allowed_mentions: { parse: [] },
        }) });
        await repository.recordActivityPost(channel.guild_id, activity.id, channel.channel_id);
        activityPosts += 1;
      } catch (error) {
        console.error(JSON.stringify({ event: "scheduled_activity_failed", guildId: channel.guild_id, activityId: activity.id, error: error instanceof Error ? error.message : String(error) }));
        break;
      }
    }
  }
  const trackedChannels = channels.filter((row) => row.kind !== "activities");
  const announcementByGuild = new Map(trackedChannels.filter((row) => row.kind === "seasonal").map((row) => [row.guild_id, row.channel_id]));
  const emojiByGuild = new Map<string, CommunityEmojiMap>();
  for (const guildId of new Set(trackedChannels.map((row) => row.guild_id))) emojiByGuild.set(guildId, await fetchCommunityEmojis(env, guildId));
  let awards = 0;
  const stampAnnouncements = new Map<string, PendingStampAnnouncement>();
  for (const channel of trackedChannels) {
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
      for (const item of messages) awards += await processMessage(env, repository, channel.guild_id, channel.kind, announcementByGuild.get(channel.guild_id) || channel.channel_id, item, emojiByGuild.get(channel.guild_id) ?? new Map(), stampAnnouncements);
      const newest = messages.at(-1);
      if (newest) await repository.updateChannelCursor(channel.guild_id, channel.kind, newest.id);
    } catch (error) {
      console.error(JSON.stringify({ event: "automation_channel_failed", guildId: channel.guild_id, kind: channel.kind, error: error instanceof Error ? error.message : String(error) }));
    }
  }
  let announcementPosts = 0;
  for (const announcement of stampAnnouncements.values()) {
    try {
      await announceStamp(env, announcement);
      announcementPosts += 1;
    } catch (error) {
      console.error(JSON.stringify({ event: "stamp_announcement_failed", channelId: announcement.channelId, stamp: announcement.stamp.slug, recipients: announcement.userIds.size, error: error instanceof Error ? error.message : String(error) }));
    }
  }
  console.log(JSON.stringify({ event: "automation_complete", channels: channels.length, activityPosts, pollUpdates, awards, announcementPosts }));
}
