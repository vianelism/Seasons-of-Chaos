import { verifyKey } from "discord-interactions";
import type { AutomationKind, DiscordEmoji, DiscordInteraction, DiscordMember, DiscordOption, DiscordRole, DiscordUser } from "./cloudflare-types.js";
import { D1PassportRepository } from "./d1-repository.js";
import type { Season, StampDefinition } from "./types.js";
import { assignRewardRole, discordRequest, runAutomation } from "./automation.js";
import { COMMUNITY_EMOJI_NAMES, COMMUNITY_EMOTE_GROUPS, communityEmoji, communityEmojiId, fetchCommunityEmojis, type CommunityEmojiMap } from "./community-emojis.js";
import { FALL_2026_ACTIVITIES } from "./config/fall-2026-activities.js";
import { EVENT_POLLS } from "./config/event-polls.js";

const PING = 1, APPLICATION_COMMAND = 2, AUTOCOMPLETE = 4, CHANNEL_MESSAGE = 4, AUTOCOMPLETE_RESULT = 8, EPHEMERAL = 64;
const ADMINISTRATOR = 1n << 3n, MANAGE_GUILD = 1n << 5n;
const json = (body: unknown, status = 200) => Response.json(body, { status });
const message = (content: string, ephemeral = false, embeds?: unknown[]) => json({ type: CHANNEL_MESSAGE, data: { content, embeds, flags: ephemeral ? EPHEMERAL : undefined } });

function option(options: DiscordOption[] | undefined, name: string): string | boolean | undefined { return options?.find((item) => item.name === name)?.value; }
function displayName(user: DiscordUser, member?: DiscordMember): string { return member?.nick || user.global_name || user.username; }
function avatarUrl(user: DiscordUser): string | undefined { return user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : undefined; }
function isModerator(interaction: DiscordInteraction, env: Env): boolean {
  const permissions = BigInt(interaction.member?.permissions || "0");
  if ((permissions & ADMINISTRATOR) === ADMINISTRATOR || (permissions & MANAGE_GUILD) === MANAGE_GUILD) return true;
  const allowed = new Set((env.MODERATOR_ROLE_IDS || "").split(",").map((id) => id.trim()).filter(Boolean));
  return interaction.member?.roles?.some((role) => allowed.has(role)) ?? false;
}
function progressBar(earned: number, total: number): string {
  const filled = total ? Math.round((earned / total) * 10) : 0;
  return `${"▰".repeat(filled)}${"▱".repeat(10 - filled)} ${earned}/${total}`;
}
function groupStamps(stamps: StampDefinition[]): Array<{ name: string; value: string }> {
  const groups = new Map<string, StampDefinition[]>();
  for (const stamp of stamps) groups.set(stamp.category, [...(groups.get(stamp.category) ?? []), stamp]);
  return [...groups].map(([category, items]) => ({ name: category, value: items.map((stamp) => `${stamp.emoji} **${stamp.name}** — ${stamp.description}`).join("\n").slice(0, 1024) }));
}

function isDiscordInteraction(value: unknown): value is DiscordInteraction {
  if (typeof value !== "object" || value === null) return false;
  return typeof (value as { type?: unknown }).type === "number";
}

async function passport(interaction: DiscordInteraction, repository: D1PassportRepository, emojis: CommunityEmojiMap): Promise<Response> {
  const seasonSlug = String(option(interaction.data?.options, "season") || "") || undefined;
  const season = seasonSlug ? await repository.findSeason(seasonSlug) : undefined;
  if (seasonSlug && !season) return message("That season could not be found.", true);
  const targetId = String(option(interaction.data?.options, "user") || interaction.member?.user?.id || interaction.user?.id);
  const user = interaction.data?.resolved?.users?.[targetId] || interaction.member?.user || interaction.user;
  const member = interaction.data?.resolved?.members?.[targetId] || (user?.id === interaction.member?.user?.id ? interaction.member : undefined);
  if (!interaction.guild_id || !user) return message("Passports only work inside a server.", true);
  const [earned, active] = await Promise.all([repository.getEarned(interaction.guild_id, user.id, seasonSlug), repository.listActiveStamps(seasonSlug)]);
  const earnedSlugs = new Set(earned.map((stamp) => stamp.slug));
  const publicUnearned = active.filter((stamp) => !stamp.secret && !earnedSlugs.has(stamp.slug));
  const secretCount = active.filter((stamp) => stamp.secret && !earnedSlugs.has(stamp.slug)).length;
  const earnedText = earned.length ? earned.map((stamp) => `${stamp.emoji} **${stamp.name}**`).join("\n") : "No stamps yet—and absolutely no pressure. The passport office remains open. 🍁";
  const lockedText = [...publicUnearned.map((stamp) => `🔒 ${stamp.name}`), ...(secretCount ? [`❔ ${secretCount} secret achievement${secretCount === 1 ? "" : "s"}`] : [])].join("\n") || "Every active stamp has been found. Icon behavior. ✨";
  const scope = season ? `${season.emoji} ${season.name}` : "🌎 Lifetime Passport";
  return message("", false, [{ color: 0xD86C32, author: { name: `${communityEmoji(emojis, "passport", "🛂")} ${displayName(user, member)}'s Seasons of Chaos Passport`, icon_url: avatarUrl(user) }, description: `**${scope}**\n${progressBar(earned.length, active.length)}`, fields: [{ name: `Stamps earned (${earned.length})`, value: earnedText.slice(0, 1024) }, { name: "Still out there", value: lockedText.slice(0, 1024) }], footer: { text: season ? "Seasonal view • Lifetime stamps never reset" : "Every season stacks • Participation is delightfully optional" } }]);
}

async function stamps(interaction: DiscordInteraction, repository: D1PassportRepository, emojis: CommunityEmojiMap): Promise<Response> {
  const seasonSlug = String(option(interaction.data?.options, "season") || "") || undefined;
  const season = seasonSlug ? await repository.findSeason(seasonSlug) : undefined;
  if (seasonSlug && !season) return message("That season could not be found.", true);
  const active = await repository.listActiveStamps(seasonSlug);
  const publicStamps = active.filter((stamp) => !stamp.secret);
  const secretCount = active.filter((stamp) => stamp.secret).length;
  return message("", false, [{ color: 0x7A3E65, title: `${season?.emoji || communityEmoji(emojis, "passportchaos", "🛂")} ${season?.name || "Seasons of Chaos"} Stamp Catalog`, description: "Collect achievements at your own pace. Every season stacks, and this is still not homework.", fields: groupStamps(publicStamps), footer: { text: `${communityEmoji(emojis, "lurking", "👀")} ${secretCount} secret achievement${secretCount === 1 ? " is" : "s are"} also lurking…` } }]);
}

function statusLabel(season: Season): string {
  return season.status === "active" ? "🟢 Active" : season.status === "upcoming" ? "🔜 Upcoming" : "📚 Archived";
}

async function seasons(repository: D1PassportRepository): Promise<Response> {
  const items = await repository.listSeasons();
  return message("", false, [{ color: 0x4E7A5B, title: "🌦️ Seasons of Chaos", description: "One lifetime passport. Every season adds another collection—nothing resets.", fields: items.map((season) => ({ name: `${season.emoji} ${season.name} • ${statusLabel(season)}`, value: `${season.description}\n${season.startsOn} → ${season.endsOn}` })), footer: { text: "Use /passport season: to revisit any collection" } }]);
}

async function rewards(interaction: DiscordInteraction, repository: D1PassportRepository, emojis: CommunityEmojiMap): Promise<Response> {
  const targetId = String(option(interaction.data?.options, "user") || interaction.member?.user?.id || interaction.user?.id);
  const user = interaction.data?.resolved?.users?.[targetId] || interaction.member?.user || interaction.user;
  const member = interaction.data?.resolved?.members?.[targetId] || (user?.id === interaction.member?.user?.id ? interaction.member : undefined);
  if (!interaction.guild_id || !user) return message("Rewards only work inside a server.", true);
  const definitions = await repository.listRewards();
  const progress = await Promise.all(definitions.map(async (reward) => ({ reward, count: (await repository.getEarned(interaction.guild_id!, user.id, reward.seasonSlug)).length })));
  return message("", false, [{ color: 0xD6A537, title: `${communityEmoji(emojis, "chaosapproved", "🎁")} ${displayName(user, member)}'s Reward Progress`, description: "Seasonal and lifetime rewards stack alongside the passport.", fields: progress.map(({ reward, count }) => ({ name: `${count >= reward.threshold ? communityEmoji(emojis, "done", "✅") : "🔒"} ${reward.emoji} ${reward.name}`, value: `${reward.description}\n${Math.min(count, reward.threshold)}/${reward.threshold} stamps${reward.seasonSlug ? " in this collection" : " lifetime"}` })), footer: { text: "Rewards can grow over time without resetting passport progress" } }]);
}

async function award(interaction: DiscordInteraction, repository: D1PassportRepository, env: Env, emojis: CommunityEmojiMap): Promise<Response> {
  if (!isModerator(interaction, env)) return message("The passport office denied that paperwork. This command is for moderators only. 🗃️", true);
  const targetId = String(option(interaction.data?.options, "user")), slug = String(option(interaction.data?.options, "stamp"));
  const user = interaction.data?.resolved?.users?.[targetId], member = interaction.data?.resolved?.members?.[targetId];
  const stamp = await repository.findActiveStamp(slug);
  if (!interaction.guild_id || !user || !stamp) return message("That member or stamp could not be found.", true);
  const created = await repository.award(interaction.guild_id, user.id, displayName(user, member), stamp.slug, interaction.member?.user?.id || interaction.user?.id || "unknown");
  if (!created) return message(`${displayName(user, member)} already has ${stamp.emoji} **${stamp.name}**. The passport office caught the duplicate.`, true);
  const unlocked = await repository.claimUnlockedRewards(interaction.guild_id, user.id);
  for (const reward of unlocked) await assignRewardRole(env, interaction.guild_id, user.id, reward);
  const announce = option(interaction.data?.options, "announce") !== false;
  const rewardText = unlocked.length ? `\n\n**REWARD UNLOCKED ${communityEmoji(emojis, "secretunlocked", "🎁")}** ${unlocked.map((reward) => `${reward.emoji} **${reward.name}**`).join(", ")}` : "";
  return message(`**STAMP EARNED ${communityEmoji(emojis, "stampearned", "🎉")}**\n${stamp.emoji} <@${user.id}> earned the **${stamp.name}** passport stamp!${stamp.announcement ? `\n*${stamp.announcement}*` : `\n*${communityEmoji(emojis, "chaosapproved", "✅")} The passport office has approved this nonsense.*`}${rewardText}`, !announce);
}

async function revoke(interaction: DiscordInteraction, repository: D1PassportRepository, env: Env): Promise<Response> {
  if (!isModerator(interaction, env)) return message("The passport office denied that paperwork. This command is for moderators only. 🗃️", true);
  const targetId = String(option(interaction.data?.options, "user")), slug = String(option(interaction.data?.options, "stamp"));
  const user = interaction.data?.resolved?.users?.[targetId], stamp = await repository.findActiveStamp(slug);
  if (!interaction.guild_id || !user || !stamp) return message("That member or stamp could not be found.", true);
  const removed = await repository.revoke(interaction.guild_id, user.id, slug);
  const name = displayName(user, interaction.data?.resolved?.members?.[targetId]);
  return message(removed ? `${stamp.emoji} **${stamp.name}** was removed from ${name}'s passport. Paperwork corrected.` : `${name} did not have that stamp, so nothing changed.`, true);
}

const AUTOMATION_KINDS = new Set<AutomationKind>(["activities", "seasonal", "photos", "movie-night", "game-night"]);
const CHECK_IN_SLUGS = new Set(["cozy-af", "outside-ish", "sweater-weather-survivor", "little-treat-committee", "pumpkin-problems", "costume-department", "candy-tax-auditor", "i-brought-a-dish", "grateful-ish", "leftovers-legend"]);

async function setupChannel(interaction: DiscordInteraction, repository: D1PassportRepository, env: Env): Promise<Response> {
  if (!isModerator(interaction, env)) return message("Channel setup is for moderators only. The passport office remains annoyingly secure. 🗃️", true);
  const kind = String(option(interaction.data?.options, "kind")) as AutomationKind;
  const channelId = String(option(interaction.data?.options, "channel") || "");
  if (!interaction.guild_id || !AUTOMATION_KINDS.has(kind) || !channelId) return message("I could not understand that channel setup.", true);
  await repository.configureChannel(interaction.guild_id, kind, channelId, interaction.member?.user?.id || interaction.user?.id || "unknown");
  return message(kind === "activities" ? `✅ Scheduled activities will post automatically in <#${channelId}>. The hourly schedule will take it from here.` : `✅ Automatic **${kind}** tracking is now watching <#${channelId}>. New activity is checked once per hour.`, true);
}

async function automationStatus(interaction: DiscordInteraction, repository: D1PassportRepository, emojis: CommunityEmojiMap): Promise<Response> {
  if (!interaction.guild_id) return message("Automation status only works inside a server.", true);
  const configured = await repository.listAutomationChannels(interaction.guild_id);
  const lines = (["activities", "seasonal", "photos", "movie-night", "game-night"] as AutomationKind[]).map((kind) => {
    const found = configured.find((item) => item.kind === kind);
    return `${found ? "✅" : "⬜"} **${kind}** — ${found ? `<#${found.channel_id}>` : "not configured"}`;
  });
  return message("", false, [{ color: 0x4E7A5B, title: `${communityEmoji(emojis, "justwatching", "⚙️")} Event Automation`, description: `${lines.join("\n")}\n\nThe bot posts due activities and checks configured participation channels once per hour. Members can use **/check-in** for activities a message cannot identify safely.` }]);
}

async function checkIn(interaction: DiscordInteraction, repository: D1PassportRepository, env: Env, emojis: CommunityEmojiMap): Promise<Response> {
  const slug = String(option(interaction.data?.options, "activity") || "");
  const user = interaction.member?.user || interaction.user;
  if (!interaction.guild_id || !user || !CHECK_IN_SLUGS.has(slug)) return message("That check-in could not be processed.", true);
  const stamp = await repository.findActiveStamp(slug);
  if (!stamp) return message("That stamp is not active right now.", true);
  const created = await repository.award(interaction.guild_id, user.id, displayName(user, interaction.member), slug, "self-check-in");
  if (!created) return message(`${stamp.emoji} You already have **${stamp.name}**. No duplicate paperwork required.`, true);
  const rewards = await repository.claimUnlockedRewards(interaction.guild_id, user.id);
  for (const reward of rewards) await assignRewardRole(env, interaction.guild_id, user.id, reward);
  const rewardText = rewards.length ? `\n\n**REWARD UNLOCKED ${communityEmoji(emojis, "secretunlocked", "🎁")}** ${rewards.map((reward) => `${reward.emoji} **${reward.name}**`).join(", ")}` : "";
  return message(`**STAMP EARNED ${communityEmoji(emojis, "stampearned", "🎉")}**\n${stamp.emoji} <@${user.id}> earned **${stamp.name}**!\n*${communityEmoji(emojis, "chaosapproved", "✅")} ${stamp.announcement || "Officially documented for absolutely no important reason."}*${rewardText}`);
}

const FALL_REWARD_ROLES: Record<string, { name: string; color: number }> = {
  "first-leaves": { name: "🍁 First Leaves", color: 0xC96E28 },
  "certified-cozy": { name: "🧣 Certified Cozy", color: 0x8B5E3C },
  "fall-main-character": { name: "🎤 Fall Main Character", color: 0xB94E73 },
  "fall-chaos-legend": { name: "👑 Fall Chaos Legend", color: 0xD4A72C },
};

async function setupRewards(interaction: DiscordInteraction, repository: D1PassportRepository, env: Env): Promise<Response> {
  if (!isModerator(interaction, env)) return message("Reward setup is for moderators only. 🗃️", true);
  if (!interaction.guild_id) return message("Reward setup only works inside a server.", true);
  try {
    const rolesResponse = await discordRequest(env, `/guilds/${interaction.guild_id}/roles`);
    const roles = (await rolesResponse.json()) as DiscordRole[];
    const connected: string[] = [];
    for (const [slug, definition] of Object.entries(FALL_REWARD_ROLES)) {
      let role = roles.find((item) => item.name === definition.name);
      if (!role) {
        const created = await discordRequest(env, `/guilds/${interaction.guild_id}/roles`, {
          method: "POST",
          headers: { "X-Audit-Log-Reason": encodeURIComponent("Seasons of Chaos automatic Fall 2026 rewards") },
          body: JSON.stringify({ name: definition.name, color: definition.color, permissions: "0", hoist: false, mentionable: false }),
        });
        role = (await created.json()) as DiscordRole;
        roles.push(role);
      }
      await repository.setRewardRole(slug, role.id);
      connected.push(`<@&${role.id}>`);
    }
    const updatedRewards = await repository.listRewards();
    for (const userId of await repository.listUserIds(interaction.guild_id)) {
      for (const reward of updatedRewards.filter((item) => item.roleRewardId)) {
        const count = (await repository.getEarned(interaction.guild_id, userId, reward.seasonSlug)).length;
        if (count >= reward.threshold) await assignRewardRole(env, interaction.guild_id, userId, reward);
      }
    }
    return message(`✅ Fall reward roles are created, connected, and synced:\n${connected.join("\n")}`, true);
  } catch (error) {
    console.error(JSON.stringify({ event: "reward_setup_failed", error: error instanceof Error ? error.message : String(error) }));
    return message("Discord blocked reward-role setup. Give the bot **Manage Roles**, move its bot role above the reward roles, then run `/setup-rewards` again.", true);
  }
}

function chaosHelp(emojis: CommunityEmojiMap): Response {
  return message("", false, [{ color: 0xD86C32, title: `${communityEmoji(emojis, "chaoscrew", "🍂")} Seasons of Chaos — Quick Guide`, description: "Join when you can. This is community fun, not homework.", fields: [
    { name: "Automatic event hosting", value: "The bot posts the full September–January activity schedule and checks participation channels once per hour." },
    { name: "Activity check-ins", value: "Use **/check-in** for cozy moments, treats, costumes, gratitude, and other activities the bot cannot identify safely." },
    { name: "Your collection", value: "Use **/passport** to see your stamps, **/stamps** to browse public achievements, and **/rewards** for reward progress." },
    { name: "Community emotes", value: "Use **/emotes** to browse or post one. Moderators can use **/add-emote** to copy one into this server's normal emote picker." },
    { name: "Fall event plan", value: "Use **/event-guide** for the September–January activities and the official no-pressure promise." },
    { name: "Secret achievements", value: "Some stamps stay hidden until the passport office decides you have caused enough seasonal activity." },
  ], footer: { text: "No leaderboard • No required participation • Every season stacks" } }]);
}

async function eventGuide(interaction: DiscordInteraction, repository: D1PassportRepository, emojis: CommunityEmojiMap): Promise<Response> {
  const now = new Date().toISOString();
  const upcoming = FALL_2026_ACTIVITIES.filter((activity) => activity.scheduledAt > now).slice(0, 5);
  const upcomingPoll = EVENT_POLLS.find((event) => event.datePollAt > now);
  const activityChannel = interaction.guild_id ? (await repository.listAutomationChannels(interaction.guild_id)).find((row) => row.kind === "activities") : undefined;
  return message("", false, [{
    color: 0xD86C32,
    title: `${communityEmoji(emojis, "cozy", "🍂")} Fall Into Chaos 2026–27`,
    description: `This is the live automated schedule—not a static announcement. ${activityChannel ? `Activities post in <#${activityChannel.channel_id}>.` : "A moderator still needs to choose the posting channel with **/setup-channel kind: Scheduled activities and prompts**."}`,
    fields: [
      { name: "Up next", value: upcoming.length ? upcoming.map((activity) => `**<t:${Math.floor(new Date(activity.scheduledAt).getTime() / 1000)}:D>** — ${activity.title}`).join("\n") : "The Fall Into Chaos schedule is complete. We survived." },
      { name: "What runs automatically", value: `${FALL_2026_ACTIVITIES.length} scheduled posts: September kickoff activities, 31 daily Halloween prompts, Friendsgiving, 12 Days of Discord, Holiday Chaos, and January's wrap-up.` },
      { name: "Flexible live events", value: upcomingPoll ? `Next planning poll: **${upcomingPoll.emoji} ${upcomingPoll.name}** on <t:${Math.floor(new Date(upcomingPoll.datePollAt).getTime() / 1000)}:D>. The bot asks for all workable dates, then follows with a time poll.` : "All scheduled movie and game planning polls are complete." },
      { name: `${communityEmoji(emojis, "passportchaos", "🛂")} Passport connection`, value: "The bot separately tracks configured conversation, photo, movie-night, and game-night channels, plus self-service check-ins and surprise achievements." },
      { name: "❤️ Most importantly", value: "This is free, casual, and mostly asynchronous. Participate a lot, once, late, or after disappearing for weeks. Lurking is valid. There are no purchases, leaderboards, or participation requirements." },
    ],
    footer: { text: "Different seasons • Same chaos • Real life always comes first" },
  }]);
}

function emotesCommand(interaction: DiscordInteraction, emojis: CommunityEmojiMap): Response {
  const selected = String(option(interaction.data?.options, "name") || "").toLowerCase();
  if (selected) {
    if (!COMMUNITY_EMOJI_NAMES.includes(selected as (typeof COMMUNITY_EMOJI_NAMES)[number])) return message("That is not a Seasons of Chaos emote name.", true);
    const rendered = emojis.get(selected);
    if (!rendered) return message(`:${selected}: has not been uploaded to the Discord application yet.`, true);
    return message(rendered);
  }
  const available = COMMUNITY_EMOJI_NAMES.filter((name) => emojis.has(name));
  if (!available.length) return message("", false, [{ color: 0x7A3E65, title: "✨ Community Emote Drawer", description: "No Seasons of Chaos application emojis are uploaded yet. Unicode fallbacks remain active." }]);
  const fields = COMMUNITY_EMOTE_GROUPS.map((group) => ({
    name: group.name,
    value: group.emotes.filter((name) => emojis.has(name)).map((name) => `${emojis.get(name)}  \`:${name}:\``).join("\n") || "*Coming soon*",
    inline: true,
  }));
  return message("", false, [{ color: 0x7A3E65, title: `${communityEmoji(emojis, "chaos", "✨")} Community Emote Drawer`, description: "Your official supply of reactions, moods, and completely necessary chaos.", fields, footer: { text: "Use /emotes name: to post one" } }]);
}

async function addEmote(interaction: DiscordInteraction, env: Env, emojis: CommunityEmojiMap): Promise<Response> {
  if (!isModerator(interaction, env)) return message("Only moderators can add emotes to the server picker. The emote drawer remains open for browsing. 🗃️", true);
  if (!interaction.guild_id) return message("Server emotes can only be added from inside a server.", true);
  const selected = String(option(interaction.data?.options, "name") || "").toLowerCase();
  if (!COMMUNITY_EMOJI_NAMES.includes(selected as (typeof COMMUNITY_EMOJI_NAMES)[number])) return message("That is not a Seasons of Chaos emote name.", true);
  const sourceId = communityEmojiId(emojis, selected);
  if (!sourceId) return message(`:${selected}: is not available in the bot's application emote drawer yet.`, true);
  try {
    const existingResponse = await discordRequest(env, `/guilds/${interaction.guild_id}/emojis`);
    const existing = (await existingResponse.json()) as DiscordEmoji[];
    const duplicate = existing.find((item) => item.name?.toLowerCase() === selected);
    if (duplicate) return message(`<:${selected}:${duplicate.id}> is already in this server's emote picker. No duplicate chaos required.`, true);

    const imageResponse = await fetch(`https://cdn.discordapp.com/emojis/${sourceId}.webp?size=128&quality=lossless`);
    if (!imageResponse.ok) throw new Error(`Application emote download returned ${imageResponse.status}`);
    const bytes = new Uint8Array(await imageResponse.arrayBuffer());
    const image = `data:image/webp;base64,${Buffer.from(bytes).toString("base64")}`;
    const createdResponse = await discordRequest(env, `/guilds/${interaction.guild_id}/emojis`, {
      method: "POST",
      headers: { "X-Audit-Log-Reason": encodeURIComponent(`Seasons of Chaos /add-emote requested by ${interaction.member?.user?.id || interaction.user?.id || "unknown"}`) },
      body: JSON.stringify({ name: selected, image }),
    });
    const created = (await createdResponse.json()) as DiscordEmoji;
    return message(`**EMOTE ADDED ${communityEmoji(emojis, "chaosapproved", "✅")}**\n<:${selected}:${created.id}> is now in this server's emote picker as \`:${selected}:\`.`, true);
  } catch (error) {
    console.error(JSON.stringify({ event: "guild_emote_import_failed", guildId: interaction.guild_id, emote: selected, error: error instanceof Error ? error.message : String(error) }));
    return message("Discord blocked the emote import. Make sure the server has an open emote slot and the bot has **Create Expressions** permission, then try `/add-emote` again.", true);
  }
}

async function autocomplete(interaction: DiscordInteraction, repository: D1PassportRepository, env: Env): Promise<Response> {
  const search = String(interaction.data?.options?.find((item) => item.focused)?.value || "").toLowerCase();
  if (["passport", "stamps"].includes(interaction.data?.name || "")) {
    const seasons = await repository.listSeasons();
    return json({ type: AUTOCOMPLETE_RESULT, data: { choices: seasons.filter((season) => `${season.name} ${season.slug}`.toLowerCase().includes(search)).slice(0, 25).map((season) => ({ name: `${season.emoji} ${season.name}`, value: season.slug })) } });
  }
  if (["emotes", "add-emote"].includes(interaction.data?.name || "")) {
    return json({ type: AUTOCOMPLETE_RESULT, data: { choices: COMMUNITY_EMOJI_NAMES.filter((name) => name.includes(search)).slice(0, 25).map((name) => ({ name: `:${name}:`, value: name })) } });
  }
  if (!isModerator(interaction, env)) return json({ type: AUTOCOMPLETE_RESULT, data: { choices: [] } });
  let choices = await repository.listActiveStamps();
  if (interaction.data?.name === "revoke" && interaction.guild_id) {
    const targetId = String(option(interaction.data.options, "user") || "");
    if (targetId) choices = await repository.getEarned(interaction.guild_id, targetId);
  }
  return json({ type: AUTOCOMPLETE_RESULT, data: { choices: choices.filter((stamp) => `${stamp.name} ${stamp.slug}`.toLowerCase().includes(search)).slice(0, 25).map((stamp) => ({ name: `${stamp.emoji} ${stamp.name}`, value: stamp.slug })) } });
}

async function handleInteraction(interaction: DiscordInteraction, env: Env): Promise<Response> {
  if (interaction.type === PING) return json({ type: PING });
  const repository = new D1PassportRepository(env.DB);
  if (interaction.type === AUTOCOMPLETE) return autocomplete(interaction, repository, env);
  if (interaction.type !== APPLICATION_COMMAND) return message("That interaction is not supported.", true);
  const emojis = interaction.guild_id ? await fetchCommunityEmojis(env, interaction.guild_id) : new Map();
  switch (interaction.data?.name) {
    case "passport": return passport(interaction, repository, emojis);
    case "stamps": return stamps(interaction, repository, emojis);
    case "seasons": return seasons(repository);
    case "rewards": return rewards(interaction, repository, emojis);
    case "award": return award(interaction, repository, env, emojis);
    case "revoke": return revoke(interaction, repository, env);
    case "setup-channel": return setupChannel(interaction, repository, env);
    case "automation-status": return automationStatus(interaction, repository, emojis);
    case "check-in": return checkIn(interaction, repository, env, emojis);
    case "setup-rewards": return setupRewards(interaction, repository, env);
    case "chaos-help": return chaosHelp(emojis);
    case "event-guide": return eventGuide(interaction, repository, emojis);
    case "emotes": return emotesCommand(interaction, emojis);
    case "add-emote": return addEmote(interaction, env, emojis);
    default: return message("The passport office cannot find that form.", true);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "GET") return json({ ok: true, app: "Seasons of Chaos" });
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const signature = request.headers.get("x-signature-ed25519"), timestamp = request.headers.get("x-signature-timestamp");
    const rawBody = await request.text();
    if (!signature || !timestamp || !env.DISCORD_PUBLIC_KEY || !(await verifyKey(rawBody, signature, timestamp, env.DISCORD_PUBLIC_KEY))) return new Response("Invalid request signature", { status: 401 });
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!isDiscordInteraction(parsed)) return new Response("Invalid interaction payload", { status: 400 });
      return await handleInteraction(parsed, env);
    } catch (error) {
      console.error(JSON.stringify({ message: "interaction failed", error: error instanceof Error ? error.message : String(error) }));
      return message("The passport office experienced a tiny paperwork fire. Please try again. 🔥", true);
    }
  },
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runAutomation(env));
  },
} satisfies ExportedHandler<Env>;
