CREATE TABLE automation_channels_new (
  guild_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('activities','seasonal','photos','movie-night','game-night')),
  channel_id TEXT NOT NULL,
  last_message_id TEXT,
  configured_by TEXT NOT NULL,
  configured_at TEXT NOT NULL,
  PRIMARY KEY (guild_id, kind)
);

INSERT INTO automation_channels_new (guild_id,kind,channel_id,last_message_id,configured_by,configured_at)
SELECT guild_id,kind,channel_id,last_message_id,configured_by,configured_at FROM automation_channels;

DROP TABLE automation_channels;
ALTER TABLE automation_channels_new RENAME TO automation_channels;
