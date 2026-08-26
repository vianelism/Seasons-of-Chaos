import type { StampCategory } from "./types.js";
export interface DiscordUser { id: string; username: string; global_name?: string | null; avatar?: string | null; }
export interface DiscordMember { nick?: string | null; roles?: string[]; permissions?: string; user?: DiscordUser; }
export interface DiscordOption { name: string; type: number; value?: string | boolean; focused?: boolean; }
export interface DiscordInteraction {
  type: number; guild_id?: string; member?: DiscordMember; user?: DiscordUser;
  data?: { name?: string; options?: DiscordOption[]; resolved?: { users?: Record<string, DiscordUser>; members?: Record<string, DiscordMember> } };
}
export interface DiscordMessage {
  id: string; channel_id: string; timestamp: string; content?: string;
  author: DiscordUser & { bot?: boolean }; member?: DiscordMember;
  attachments?: Array<{ id: string }>;
}
export interface AutomationChannelRow { guild_id: string; kind: AutomationKind; channel_id: string; last_message_id: string | null; }
export type AutomationKind = "seasonal" | "photos" | "movie-night" | "game-night";
export interface DiscordRole { id: string; name: string; position: number; permissions: string; managed: boolean; }
export interface DiscordEmoji { id: string; name: string | null; animated?: boolean; available?: boolean; }
export interface StampRow {
  slug: string; name: string; emoji: string; description: string; category: StampCategory;
  secret: number; active: number; role_reward_id: string | null; announcement: string | null;
  earned_at?: string; awarded_by?: string;
}
export interface SeasonRow { slug: string; name: string; emoji: string; description: string; starts_on: string; ends_on: string; status: "upcoming" | "active" | "archived"; sort_order: number; }
export interface RewardRow { slug: string; name: string; emoji: string; description: string; threshold: number; season_slug: string | null; role_reward_id: string | null; active: number; }
