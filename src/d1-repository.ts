import type { RewardRow, SeasonRow, StampRow } from "./cloudflare-types.js";
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
}
