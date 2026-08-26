export const stampCategories = [
  "Fall",
  "Halloween",
  "Friendsgiving",
  "Holidays",
  "Winter",
  "Community",
  "Events",
] as const;

export type StampCategory = (typeof stampCategories)[number];

export interface StampDefinition {
  slug: string;
  name: string;
  emoji: string;
  description: string;
  category: StampCategory;
  secret: boolean;
  active: boolean;
  roleRewardId?: string;
  announcement?: string;
}

export interface EarnedStamp extends StampDefinition {
  earnedAt: string;
  awardedBy: string;
}

export interface Season {
  slug: string;
  name: string;
  emoji: string;
  description: string;
  startsOn: string;
  endsOn: string;
  status: "upcoming" | "active" | "archived";
  sortOrder: number;
}

export interface Reward {
  slug: string;
  name: string;
  emoji: string;
  description: string;
  threshold: number;
  seasonSlug?: string;
  roleRewardId?: string;
  active: boolean;
}
