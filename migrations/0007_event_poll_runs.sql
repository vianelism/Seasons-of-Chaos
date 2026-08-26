CREATE TABLE IF NOT EXISTS event_poll_runs (
  guild_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  date_message_id TEXT NOT NULL,
  date_poll_expires_at TEXT NOT NULL,
  selected_dates TEXT,
  time_message_id TEXT,
  time_poll_expires_at TEXT,
  completed_at TEXT,
  PRIMARY KEY (guild_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_poll_runs_pending ON event_poll_runs(guild_id, completed_at);
