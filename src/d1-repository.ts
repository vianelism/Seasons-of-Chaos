import type { AutomationChannelRow, AutomationKind, EventPollRunRow, RewardRow, SeasonRow, StampRow } from "./cloudflare-types.js";
import type { EarnedStamp, Reward, Season, StampDefinition } from "./types.js";

function mapStamp(row: StampRow): StampDefinition {
  return { slug: row.slug, name: row.name, emoji: row.emoji, description: row.description, category: row.category, secret: Boolean(row.secret), active: Boolean(row.active), roleRewardId: row.role_reward_id ?? undefined, announcement: row.announcement ?? undefined };
}

export class D1PassportRepository {
  constructor(private readonly db: Env["DB"]) {}
  async listActiveStamps(seasonSlug?: string): Promise<StampDefinition[]> {
    const sql = seasonSlug
      ? "SELECT s.* FROM stamps s WHERE s.active=1 AND EXISTS (SELECT 1 FROM stamp_seasons ss WHERE ss.stamp_slug=s.slug AND ss.season_slug=?) ORDER BY s.category,s.name"
      : "SELECT * FROM stamps WHERE active = 1 ORDER BY category, name";
    const statement = this.db.prepare(sql);
    const result = await (seasonSlug ? statement.bind(seasonSlug) : statement).all<StampRow>();
    return result.results.map(mapStamp);
  }
  async findActiveStamp(slug: string): Promise<StampDefinition | undefined> {
    const row = await this.db.prepare("SELECT * FROM stamps WHERE slug = ? AND active = 1").bind(slug).first<StampRow>();
    return row ? mapStamp(row) : undefined;
  }
  async getEarned(guildId: string, userId: string, seasonSlug?: string): Promise<EarnedStamp[]> {
    const seasonalFilter = seasonSlug ? " AND EXISTS (SELECT 1 FROM stamp_seasons ss WHERE ss.stamp_slug=s.slug AND ss.season_slug=?)" : "";
    const statement = this.db.prepare(`SELECT s.*, e.earned_at, e.awarded_by FROM earned_stamps e JOIN stamps s ON s.slug=e.stamp_slug WHERE e.guild_id=? AND e.user_id=?${seasonalFilter} ORDER BY e.earned_at`);
    const result = await (seasonSlug ? statement.bind(guildId, userId, seasonSlug) : statement.bind(guildId, userId)).all<StampRow>();
    return result.results.map((row) => ({ ...mapStamp(row), earnedAt: row.earned_at!, awardedBy: row.awarded_by! }));
  }
  async award(guildId: string, userId: string, displayName: string, slug: string, awardedBy: string): Promise<boolean> {
    const timestamp = new Date().toISOString();
    await this.db.prepare("INSERT INTO users (guild_id,user_id,display_name,created_at,updated_at) VALUES (?,?,?,?,?) ON CONFLICT (guild_id,user_id) DO UPDATE SET display_name=excluded.display_name, updated_at=excluded.updated_at").bind(guildId, userId, displayName, timestamp, timestamp).run();
    const result = await this.db.prepare("INSERT OR IGNORE INTO earned_stamps (guild_id,user_id,stamp_slug,earned_at,awarded_by) VALUES (?,?,?,?,?)").bind(guildId, userId, slug, timestamp, awardedBy).run();
    return result.meta.changes === 1;
  }
  async revoke(guildId: string, userId: string, slug: string): Promise<boolean> {
    const result = await this.db.prepare("DELETE FROM earned_stamps WHERE guild_id=? AND user_id=? AND stamp_slug=?").bind(guildId, userId, slug).run();
    return result.meta.changes === 1;
  }

  async configureChannel(guildId: string, kind: AutomationKind, channelId: string, configuredBy: string): Promise<void> {
    await this.db.prepare("INSERT INTO automation_channels (guild_id,kind,channel_id,configured_by,configured_at) VALUES (?,?,?,?,?) ON CONFLICT (guild_id,kind) DO UPDATE SET channel_id=excluded.channel_id,last_message_id=NULL,configured_by=excluded.configured_by,configured_at=excluded.configured_at").bind(guildId, kind, channelId, configuredBy, new Date().toISOString()).run();
  }

  async listAutomationChannels(guildId?: string): Promise<AutomationChannelRow[]> {
    const statement = this.db.prepare(guildId ? "SELECT guild_id,kind,channel_id,last_message_id,configured_at FROM automation_channels WHERE guild_id=? ORDER BY kind" : "SELECT guild_id,kind,channel_id,last_message_id,configured_at FROM automation_channels ORDER BY guild_id,kind");
    const result = await (guildId ? statement.bind(guildId) : statement).all<AutomationChannelRow>();
    return result.results;
  }

  async hasActivityPost(guildId: string, activityId: string): Promise<boolean> {
    return Boolean(await this.db.prepare("SELECT 1 FROM activity_posts WHERE guild_id=? AND activity_id=?").bind(guildId, activityId).first());
  }

  async recordActivityPost(guildId: string, activityId: string, channelId: string): Promise<void> {
    await this.db.prepare("INSERT OR IGNORE INTO activity_posts (guild_id,activity_id,channel_id,posted_at) VALUES (?,?,?,?)").bind(guildId, activityId, channelId, new Date().toISOString()).run();
  }

  async recordCustomEvent(input: { id: string; guildId: string; kind: "activity" | "scheduled-event"; title: string; description: string; channelId?: string; messageId?: string; discordEventId?: string; startsAt?: string; createdBy: string }): Promise<void> {
    await this.db.prepare("INSERT INTO custom_events (id,guild_id,kind,title,description,channel_id,discord_message_id,discord_event_id,starts_at,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
      .bind(input.id, input.guildId, input.kind, input.title, input.description, input.channelId ?? null, input.messageId ?? null, input.discordEventId ?? null, input.startsAt ?? null, input.createdBy, new Date().toISOString()).run();
  }

  async findEventPollRun(guildId: string, eventId: string): Promise<EventPollRunRow | undefined> {
    return (await this.db.prepare("SELECT * FROM event_poll_runs WHERE guild_id=? AND event_id=?").bind(guildId, eventId).first<EventPollRunRow>()) ?? undefined;
  }

  async createEventPollRun(guildId: string, eventId: string, channelId: string, messageId: string, expiresAt: string): Promise<void> {
    await this.db.prepare("INSERT OR IGNORE INTO event_poll_runs (guild_id,event_id,channel_id,date_message_id,date_poll_expires_at) VALUES (?,?,?,?,?)").bind(guildId, eventId, channelId, messageId, expiresAt).run();
  }

  async recordTimePoll(guildId: string, eventId: string, selectedDates: string[], messageId: string, expiresAt: string): Promise<void> {
    await this.db.prepare("UPDATE event_poll_runs SET selected_dates=?,time_message_id=?,time_poll_expires_at=? WHERE guild_id=? AND event_id=?").bind(JSON.stringify(selectedDates), messageId, expiresAt, guildId, eventId).run();
  }

  async completeEventPoll(guildId: string, eventId: string): Promise<void> {
    await this.db.prepare("UPDATE event_poll_runs SET completed_at=? WHERE guild_id=? AND event_id=?").bind(new Date().toISOString(), guildId, eventId).run();
  }

  async updateChannelCursor(guildId: string, kind: AutomationKind, messageId: string): Promise<void> {
    await this.db.prepare("UPDATE automation_channels SET last_message_id=? WHERE guild_id=? AND kind=?").bind(messageId, guildId, kind).run();
  }

  async recordActivityDay(guildId: string, userId: string, timestamp: string): Promise<{ monthDays: number; activeMonths: number }> {
    const day = timestamp.slice(0, 10), month = timestamp.slice(0, 7);
    await this.db.prepare("INSERT OR IGNORE INTO activity_days (guild_id,user_id,activity_date,activity_month) VALUES (?,?,?,?)").bind(guildId, userId, day, month).run();
    const counts = await this.db.batch([
      this.db.prepare("SELECT COUNT(*) AS count FROM activity_days WHERE guild_id=? AND user_id=? AND activity_month=?").bind(guildId, userId, month),
      this.db.prepare("SELECT COUNT(DISTINCT activity_month) AS count FROM activity_days WHERE guild_id=? AND user_id=? AND activity_month BETWEEN '2026-09' AND '2026-11'").bind(guildId, userId),
    ]);
    const dayCount = counts[0]?.results[0] as { count?: number } | undefined;
    const monthCount = counts[1]?.results[0] as { count?: number } | undefined;
    return { monthDays: Number(dayCount?.count ?? 0), activeMonths: Number(monthCount?.count ?? 0) };
  }

  async listSeasons(): Promise<Season[]> {
    const result = await this.db.prepare("SELECT * FROM seasons ORDER BY sort_order").all<SeasonRow>();
    return result.results.map((row) => ({ slug: row.slug, name: row.name, emoji: row.emoji, description: row.description, startsOn: row.starts_on, endsOn: row.ends_on, status: row.status, sortOrder: row.sort_order }));
  }

  async findSeason(slug: string): Promise<Season | undefined> {
    const row = await this.db.prepare("SELECT * FROM seasons WHERE slug=?").bind(slug).first<SeasonRow>();
    return row ? { slug: row.slug, name: row.name, emoji: row.emoji, description: row.description, startsOn: row.starts_on, endsOn: row.ends_on, status: row.status, sortOrder: row.sort_order } : undefined;
  }

  async listRewards(): Promise<Reward[]> {
    const result = await this.db.prepare("SELECT * FROM rewards WHERE active=1 ORDER BY season_slug IS NULL, season_slug, threshold").all<RewardRow>();
    return result.results.map((row) => ({ slug: row.slug, name: row.name, emoji: row.emoji, description: row.description, threshold: row.threshold, seasonSlug: row.season_slug ?? undefined, roleRewardId: row.role_reward_id ?? undefined, active: Boolean(row.active) }));
  }

  async claimUnlockedRewards(guildId: string, userId: string): Promise<Reward[]> {
    const unlocked: Reward[] = [];
    for (const reward of await this.listRewards()) {
      const count = (await this.getEarned(guildId, userId, reward.seasonSlug)).length;
      if (count < reward.threshold) continue;
      const result = await this.db.prepare("INSERT OR IGNORE INTO reward_unlocks (guild_id,user_id,reward_slug,unlocked_at) VALUES (?,?,?,?)").bind(guildId, userId, reward.slug, new Date().toISOString()).run();
      if (result.meta.changes === 1) unlocked.push(reward);
    }
    return unlocked;
  }

  async setRewardRole(slug: string, roleId: string): Promise<void> {
    await this.db.prepare("UPDATE rewards SET role_reward_id=? WHERE slug=?").bind(roleId, slug).run();
  }

  async listUserIds(guildId: string): Promise<string[]> {
    const result = await this.db.prepare("SELECT user_id FROM users WHERE guild_id=?").bind(guildId).all<{ user_id: string }>();
    return result.results.map((row) => row.user_id);
  }
}
