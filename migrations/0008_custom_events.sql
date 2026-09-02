CREATE TABLE IF NOT EXISTS custom_events (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('activity','scheduled-event')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  channel_id TEXT,
  discord_message_id TEXT,
  discord_event_id TEXT,
  starts_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_events_guild ON custom_events(guild_id, created_at DESC);
