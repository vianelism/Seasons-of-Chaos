import { verifyKey } from "discord-interactions";
import type { DiscordInteraction, DiscordMember, DiscordOption, DiscordUser } from "./cloudflare-types.js";
import { D1PassportRepository } from "./d1-repository.js";
import type { Season, StampDefinition } from "./types.js";

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

async function passport(interaction: DiscordInteraction, repository: D1PassportRepository): Promise<Response> {
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
  return message("", false, [{ color: 0xD86C32, author: { name: `${displayName(user, member)}'s Seasons of Chaos Passport`, icon_url: avatarUrl(user) }, description: `**${scope}**\n${progressBar(earned.length, active.length)}`, fields: [{ name: `Stamps earned (${earned.length})`, value: earnedText.slice(0, 1024) }, { name: "Still out there", value: lockedText.slice(0, 1024) }], footer: { text: season ? "Seasonal view • Lifetime stamps never reset" : "Every season stacks • Participation is delightfully optional" } }]);
}

async function stamps(interaction: DiscordInteraction, repository: D1PassportRepository): Promise<Response> {
  const seasonSlug = String(option(interaction.data?.options, "season") || "") || undefined;
  const season = seasonSlug ? await repository.findSeason(seasonSlug) : undefined;
  if (seasonSlug && !season) return message("That season could not be found.", true);
  const active = await repository.listActiveStamps(seasonSlug);
  const publicStamps = active.filter((stamp) => !stamp.secret);
  const secretCount = active.filter((stamp) => stamp.secret).length;
  return message("", false, [{ color: 0x7A3E65, title: `${season?.emoji || "🛂"} ${season?.name || "Seasons of Chaos"} Stamp Catalog`, description: "Collect achievements at your own pace. Every season stacks, and this is still not homework.", fields: groupStamps(publicStamps), footer: { text: `${secretCount} secret achievement${secretCount === 1 ? " is" : "s are"} also lurking…` } }]);
}

function statusLabel(season: Season): string {
  return season.status === "active" ? "🟢 Active" : season.status === "upcoming" ? "🔜 Upcoming" : "📚 Archived";
}

async function seasons(repository: D1PassportRepository): Promise<Response> {
  const items = await repository.listSeasons();
  return message("", false, [{ color: 0x4E7A5B, title: "🌦️ Seasons of Chaos", description: "One lifetime passport. Every season adds another collection—nothing resets.", fields: items.map((season) => ({ name: `${season.emoji} ${season.name} • ${statusLabel(season)}`, value: `${season.description}\n${season.startsOn} → ${season.endsOn}` })), footer: { text: "Use /passport season: to revisit any collection" } }]);
}

async function rewards(interaction: DiscordInteraction, repository: D1PassportRepository): Promise<Response> {
  const targetId = String(option(interaction.data?.options, "user") || interaction.member?.user?.id || interaction.user?.id);
  const user = interaction.data?.resolved?.users?.[targetId] || interaction.member?.user || interaction.user;
  const member = interaction.data?.resolved?.members?.[targetId] || (user?.id === interaction.member?.user?.id ? interaction.member : undefined);
  if (!interaction.guild_id || !user) return message("Rewards only work inside a server.", true);
  const definitions = await repository.listRewards();
  const progress = await Promise.all(definitions.map(async (reward) => ({ reward, count: (await repository.getEarned(interaction.guild_id!, user.id, reward.seasonSlug)).length })));
  return message("", false, [{ color: 0xD6A537, title: `🎁 ${displayName(user, member)}'s Reward Progress`, description: "Seasonal and lifetime rewards stack alongside the passport.", fields: progress.map(({ reward, count }) => ({ name: `${count >= reward.threshold ? "✅" : "🔒"} ${reward.emoji} ${reward.name}`, value: `${reward.description}\n${Math.min(count, reward.threshold)}/${reward.threshold} stamps${reward.seasonSlug ? " in this collection" : " lifetime"}` })), footer: { text: "Rewards can grow over time without resetting passport progress" } }]);
}

async function award(interaction: DiscordInteraction, repository: D1PassportRepository, env: Env): Promise<Response> {
  if (!isModerator(interaction, env)) return message("The passport office denied that paperwork. This command is for moderators only. 🗃️", true);
  const targetId = String(option(interaction.data?.options, "user")), slug = String(option(interaction.data?.options, "stamp"));
  const user = interaction.data?.resolved?.users?.[targetId], member = interaction.data?.resolved?.members?.[targetId];
  const stamp = await repository.findActiveStamp(slug);
  if (!interaction.guild_id || !user || !stamp) return message("That member or stamp could not be found.", true);
  const created = await repository.award(interaction.guild_id, user.id, displayName(user, member), stamp.slug, interaction.member?.user?.id || interaction.user?.id || "unknown");
  if (!created) return message(`${displayName(user, member)} already has ${stamp.emoji} **${stamp.name}**. The passport office caught the duplicate.`, true);
  const announce = option(interaction.data?.options, "announce") !== false;
  return message(`**STAMP EARNED 🎉**\n${stamp.emoji} <@${user.id}> earned the **${stamp.name}** passport stamp!${stamp.announcement ? `\n*${stamp.announcement}*` : "\n*The passport office has approved this nonsense.*"}`, !announce);
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

async function autocomplete(interaction: DiscordInteraction, repository: D1PassportRepository, env: Env): Promise<Response> {
  const search = String(interaction.data?.options?.find((item) => item.focused)?.value || "").toLowerCase();
  if (["passport", "stamps"].includes(interaction.data?.name || "")) {
    const seasons = await repository.listSeasons();
    return json({ type: AUTOCOMPLETE_RESULT, data: { choices: seasons.filter((season) => `${season.name} ${season.slug}`.toLowerCase().includes(search)).slice(0, 25).map((season) => ({ name: `${season.emoji} ${season.name}`, value: season.slug })) } });
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
  switch (interaction.data?.name) {
    case "passport": return passport(interaction, repository);
    case "stamps": return stamps(interaction, repository);
    case "seasons": return seasons(repository);
    case "rewards": return rewards(interaction, repository);
    case "award": return award(interaction, repository, env);
    case "revoke": return revoke(interaction, repository, env);
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
} satisfies ExportedHandler<Env>;
