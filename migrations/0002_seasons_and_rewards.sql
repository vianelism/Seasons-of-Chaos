CREATE TABLE IF NOT EXISTS seasons (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT NOT NULL,
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('upcoming','active','archived')),
  sort_order INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS stamp_seasons (
  stamp_slug TEXT NOT NULL,
  season_slug TEXT NOT NULL,
  PRIMARY KEY (stamp_slug, season_slug),
  FOREIGN KEY (stamp_slug) REFERENCES stamps(slug) ON DELETE CASCADE,
  FOREIGN KEY (season_slug) REFERENCES seasons(slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stamp_seasons_season ON stamp_seasons(season_slug, stamp_slug);

CREATE TABLE IF NOT EXISTS rewards (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT NOT NULL,
  threshold INTEGER NOT NULL CHECK (threshold > 0),
  season_slug TEXT,
  role_reward_id TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  FOREIGN KEY (season_slug) REFERENCES seasons(slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rewards_season ON rewards(season_slug, active);

INSERT INTO seasons (slug,name,emoji,description,starts_on,ends_on,status,sort_order) VALUES
('fall-2026','Fall 2026','🍂','Cozy fall, Halloween chaos, and Friendsgiving.','2026-09-01','2026-11-30','active',1),
('winter-2026-27','Winter 2026–27','❄️','Holiday chaos and the post-holiday winter wrap-up.','2026-12-01','2027-02-28','upcoming',2),
('spring-2027','Spring 2027','🌷','A fresh season of community chaos.','2027-03-01','2027-05-31','upcoming',3),
('summer-2027','Summer 2027','☀️','Summer fun, survival, and asynchronous adventures.','2027-06-01','2027-08-31','upcoming',4)
ON CONFLICT(slug) DO UPDATE SET name=excluded.name, emoji=excluded.emoji, description=excluded.description, starts_on=excluded.starts_on, ends_on=excluded.ends_on, status=excluded.status, sort_order=excluded.sort_order;

INSERT OR IGNORE INTO stamp_seasons (stamp_slug,season_slug) VALUES
('fall-girl-era','fall-2026'),('cozy-af','fall-2026'),('pics-or-it-didnt-happen','fall-2026'),
('spooky-bitch','fall-2026'),('boo-crew','fall-2026'),('witch-please','fall-2026'),
('stuffed-and-surviving','fall-2026'),('i-brought-a-dish','fall-2026'),
('festive-ish','winter-2026-27'),('secret-something','winter-2026-27'),('hibernation-society','winter-2026-27');

INSERT INTO rewards (slug,name,emoji,description,threshold,season_slug,role_reward_id,active) VALUES
('fall-chaos-collector','Fall Chaos Collector','🏆','Collect five Fall 2026 stamps.',5,'fall-2026',NULL,1),
('winter-chaos-collector','Winter Chaos Collector','🧊','Collect three Winter 2026–27 stamps.',3,'winter-2026-27',NULL,1),
('certified-chaos-collector','Certified Chaos Collector','👑','Collect ten stamps across any seasons.',10,NULL,NULL,1)
ON CONFLICT(slug) DO UPDATE SET name=excluded.name, emoji=excluded.emoji, description=excluded.description, threshold=excluded.threshold, season_slug=excluded.season_slug, role_reward_id=excluded.role_reward_id, active=excluded.active;
