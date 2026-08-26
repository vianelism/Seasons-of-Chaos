CREATE TABLE IF NOT EXISTS activity_posts (
  guild_id TEXT NOT NULL,
  activity_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  posted_at TEXT NOT NULL,
  PRIMARY KEY (guild_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_posts_guild ON activity_posts(guild_id, posted_at);
