PRAGMA foreign_keys = ON;

INSERT INTO stamps (slug,name,emoji,description,category,secret,active,announcement) VALUES
('outside-ish','Outside-ish','🌲','Shared a fall walk, outdoor moment, or touch-grass attempt.','Fall',0,1,'Nature has confirmed the sighting.'),
('sweater-weather-survivor','Sweater Weather Survivor','🧥','Shared a sweater, blanket, flannel, outfit, or weather-survival strategy.','Fall',0,1,'Dressed for weather and emotional support.'),
('little-treat-committee','Little Treat Committee','🥐','Shared a seasonal drink, snack, recipe, or little treat.','Fall',0,1,'The committee has approved this snack.'),
('pumpkin-problems','Pumpkin Problems','🎨','Shared a pumpkin, carving, craft, decoration, success, or disaster.','Halloween',0,1,'The pumpkin department accepts all outcomes.'),
('costume-department','Costume Department','🦸‍♀️','Shared a costume, makeup look, outfit, or costume idea.','Halloween',0,1,'Wardrobe chaos officially documented.'),
('candy-tax-auditor','Candy Tax Auditor','🍬','Participated in candy rankings, trades, opinions, or the parent tax.','Halloween',0,1,'The candy books are suspicious but approved.'),
('goblin-mode','Goblin Mode','🧌','Achievement details classified by the passport office.','Halloween',1,1,'Normal standards have been temporarily suspended.'),
('grateful-ish','Grateful-ish','💛','Shared appreciation, a small win, or community thanks.','Friendsgiving',0,1,'A little gratitude counts. No inspirational speech required.'),
('leftovers-legend','Leftovers Legend','🥡','Joined a post-holiday check-in, leftovers discussion, or recovery session.','Friendsgiving',0,1,'Still here. Possibly holding a storage container.'),
('left-no-crumbs','Left No Crumbs','🍽️','Achievement details classified by the passport office.','Friendsgiving',1,1,'A contribution was made. Crumbs were not left.')
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,emoji=excluded.emoji,description=excluded.description,category=excluded.category,secret=excluded.secret,active=excluded.active,announcement=excluded.announcement;

INSERT OR IGNORE INTO stamp_seasons (stamp_slug,season_slug) VALUES
('outside-ish','fall-2026'),('sweater-weather-survivor','fall-2026'),('little-treat-committee','fall-2026'),
('pumpkin-problems','fall-2026'),('costume-department','fall-2026'),('candy-tax-auditor','fall-2026'),
('goblin-mode','fall-2026'),('grateful-ish','fall-2026'),('leftovers-legend','fall-2026'),('left-no-crumbs','fall-2026');

UPDATE rewards SET active=0 WHERE slug='fall-chaos-collector';
INSERT INTO rewards (slug,name,emoji,description,threshold,season_slug,active) VALUES
('first-leaves','First Leaves','🍁','Collect three Fall 2026 stamps.',3,'fall-2026',1),
('certified-cozy','Certified Cozy','🧣','Collect six Fall 2026 stamps.',6,'fall-2026',1),
('fall-main-character','Fall Main Character','🎤','Collect ten Fall 2026 stamps and submit a future community prompt.',10,'fall-2026',1),
('fall-chaos-legend','Fall Chaos Legend','👑','Collect fourteen Fall 2026 stamps.',14,'fall-2026',1)
ON CONFLICT(slug) DO UPDATE SET name=excluded.name,emoji=excluded.emoji,description=excluded.description,threshold=excluded.threshold,season_slug=excluded.season_slug,active=excluded.active;

CREATE TABLE IF NOT EXISTS automation_channels (
  guild_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('seasonal','photos','movie-night','game-night')),
  channel_id TEXT NOT NULL,
  last_message_id TEXT,
  configured_by TEXT NOT NULL,
  configured_at TEXT NOT NULL,
  PRIMARY KEY (guild_id, kind)
);

CREATE TABLE IF NOT EXISTS activity_days (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  activity_date TEXT NOT NULL,
  activity_month TEXT NOT NULL,
  PRIMARY KEY (guild_id,user_id,activity_date)
);

CREATE INDEX IF NOT EXISTS idx_activity_month ON activity_days(guild_id,user_id,activity_month);

CREATE TABLE IF NOT EXISTS reward_unlocks (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reward_slug TEXT NOT NULL,
  unlocked_at TEXT NOT NULL,
  PRIMARY KEY (guild_id,user_id,reward_slug),
  FOREIGN KEY (reward_slug) REFERENCES rewards(slug) ON DELETE CASCADE
);
