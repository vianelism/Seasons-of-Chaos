PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS stamps (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Fall','Halloween','Friendsgiving','Holidays','Winter','Community','Events')),
  secret INTEGER NOT NULL DEFAULT 0 CHECK (secret IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  role_reward_id TEXT,
  announcement TEXT
);

CREATE TABLE IF NOT EXISTS earned_stamps (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  stamp_slug TEXT NOT NULL,
  earned_at TEXT NOT NULL,
  awarded_by TEXT NOT NULL,
  PRIMARY KEY (guild_id, user_id, stamp_slug),
  FOREIGN KEY (guild_id, user_id) REFERENCES users(guild_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (stamp_slug) REFERENCES stamps(slug) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_earned_user ON earned_stamps(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_earned_stamp ON earned_stamps(stamp_slug);
CREATE INDEX IF NOT EXISTS idx_stamps_active_category ON stamps(active, category);

INSERT INTO stamps (slug,name,emoji,description,category,secret,active,role_reward_id,announcement) VALUES
('fall-girl-era','Fall Girl Era','🍂','Joined the cozy fall kickoff.','Fall',0,1,NULL,NULL),
('cozy-af','Cozy AF','☕','Shared maximum cozy-season energy.','Fall',0,1,NULL,NULL),
('pics-or-it-didnt-happen','Pics or It Didn''t Happen','📸','Shared a seasonal photo with the crew.','Fall',0,1,NULL,NULL),
('spooky-bitch','Spooky Bitch','🎃','Participated in Halloween Chaos.','Halloween',0,1,NULL,NULL),
('boo-crew','Boo Crew','👻','Joined a spooky group activity.','Halloween',0,1,NULL,NULL),
('witch-please','Witch, Please','🧙‍♀️','Brought some witchy chaos to the server.','Halloween',1,1,NULL,NULL),
('stuffed-and-surviving','Stuffed & Surviving','🦃','Made it through Friendsgiving festivities.','Friendsgiving',0,1,NULL,NULL),
('i-brought-a-dish','I Brought a Dish','🥧','Contributed to a Friendsgiving activity.','Friendsgiving',0,1,NULL,NULL),
('festive-ish','Festive-ish','✨','Participated in Holiday Chaos, enthusiastically or otherwise.','Holidays',0,1,NULL,NULL),
('secret-something','Secret Something','🎁','Participated in the seasonal secret exchange.','Holidays',0,1,NULL,NULL),
('hibernation-society','Hibernation Society','🧣','Joined the winter wrap-up.','Winter',0,1,NULL,NULL),
('roll-the-credits','Roll the Credits','🎬','Joined a community movie night.','Events',0,1,NULL,NULL),
('game-on','Game On','🎮','Joined a community game night.','Events',0,1,NULL,NULL),
('menace-to-society','Menace to Society','😈','Achievement details classified by the passport office.','Community',1,1,NULL,NULL),
('mom-supporting-moms','Mom Supporting Moms','💗','Showed up with encouragement for another mom.','Community',0,1,NULL,NULL),
('professional-yapper','Professional Yapper','💬','Achievement details classified by the passport office.','Community',1,1,NULL,NULL),
('returned-from-the-dead','Returned From the Dead','🧟','Returned to the Discord after being MIA.','Community',1,1,NULL,'The rumors of their disappearance were greatly exaggerated.'),
('why-are-you-awake','Why Are You Awake?','🌙','Achievement details classified by the passport office.','Community',1,1,NULL,NULL),
('instigator','Instigator','🧨','Achievement details classified by the passport office.','Community',1,1,NULL,NULL),
('i-was-here','I Was Here','🛂','Collected memories across the whole Fall Into Chaos season.','Events',0,1,NULL,NULL)
ON CONFLICT(slug) DO UPDATE SET
  name=excluded.name, emoji=excluded.emoji, description=excluded.description,
  category=excluded.category, secret=excluded.secret, active=excluded.active,
  role_reward_id=excluded.role_reward_id, announcement=excluded.announcement;
