# Seasons of Chaos Discord App

A playful, year-round seasonal passport app for a private Discord community. Every stamp stacks into one lifetime passport, while members can filter their collection by Fall, Winter, Spring, or Summer.

## Live architecture

```text
Discord slash command
  → Cloudflare Worker (signed HTTP interaction)
  → Cloudflare D1 (users, stamps, earned stamps)
  → Discord embed or confirmation
```

No always-running computer, gateway connection, Railway service, or Supabase project is required.

## Commands

- `/passport [user]` — view an embed passport, earned stamps, progress, and locked achievements
- `/passport [user] [season]` — optionally filter the lifetime passport by season
- `/stamps [season]` — browse active public stamps without exposing secret achievements
- `/seasons` — browse current, upcoming, and archived seasonal collections
- `/rewards [user]` — view seasonal and lifetime reward progress
- `/award user stamp [announce]` — moderator-only award with duplicate prevention
- `/revoke user stamp` — moderator-only correction
- `/setup-channel kind channel` — moderator-only setup for automatic seasonal, photo, movie-night, and game-night tracking
- `/automation-status` — show which channels are being watched
- `/check-in activity` — self-service activity stamp with no moderator approval
- `/setup-rewards` — create, connect, and synchronize the four Fall reward roles
- `/chaos-help` — show a short member-friendly guide
- `/event-guide` — show the next items from the live September–January activity schedule
- `/emotes [name]` — browse uploaded community emotes or post one in the channel
- `/add-emote name` — moderator-only copy of an application emote into the server's normal emote picker

Administrators and members with **Manage Server** can award and revoke stamps. Additional moderator role IDs can be configured in `wrangler.jsonc` as a comma-separated `MODERATOR_ROLE_IDS` value.

## Automatic Fall 2026 tracking

The Worker checks configured channels once per hour. Use `/setup-channel` once for each channel type you use. A single Discord channel may be selected for more than one type. Select **Scheduled activities and prompts** once to make the bot host the preloaded event plan automatically.

- The schedule contains 66 posts from September 1 through January 27.
- It includes seven September kickoff activities, all 31 Days of Halloween, eight Friendsgiving activities, all 12 Days of Discord plus three holiday check-ins, and five January wrap-up activities.
- D1 records every posted activity per server, so hourly checks do not create duplicates.
- Configuring the activity channel after the event begins does not dump activities from before the channel was configured.
- `/event-guide` reads the same schedule and displays what is coming next; nobody maintains a separate guide by hand.

- Seasonal conversation awards the monthly participation stamps.
- Photo sharing awards `Pics or It Didn't Happen` when a message contains an attachment.
- Movie-night and game-night activity awards their event stamps.
- Activity on several different days unlocks rule-based secret achievements.
- Participating across September, October, and November unlocks `I Was Here`.
- `/check-in` handles activities the bot cannot infer reliably, such as a costume, seasonal treat, or gratitude post.
- Reward thresholds are evaluated immediately after every automatic or self-service award.

The bot needs **View Channel**, **Read Message History**, and **Send Messages** in tracked channels. A reward with a Discord role also requires **Manage Roles**, and the bot role must sit above the reward role.

After granting **Manage Roles**, run `/setup-rewards` once. The command creates zero-permission cosmetic roles for First Leaves, Certified Cozy, Fall Main Character, and Fall Chaos Legend, connects them to D1, and synchronizes qualifying existing members.

## Community emotes

The bot looks up the Discord application's custom emojis by name at runtime and presents them to members as community emotes. Members can run `/emotes` to browse a five-group drawer (Essentials, Mood Check, Reactions, Maximum Drama, and Survival Kit) or `/emotes name:` to post one. Moderators can use `/add-emote name:` to copy a selected application emote into the current server's normal emote picker for inline use by members. Duplicate names are rejected cleanly, and the application copy remains unchanged. The bot needs Discord's **Create Expressions** permission and an open server emote slot for imports.

Autocomplete includes all 30 community emote names. Unicode fallbacks remain in place, so application emojis can be changed without breaking bot responses or requiring numeric IDs in source control. Bot responses use relevant emotes for passports, stamp awards, rewards, tracking, and help; they are contextual accents rather than random unsolicited messages.

## Fall Into Chaos 2026–27 alignment

The original September–January event remains the creative brief for the first Seasons of Chaos cycle. The year-round structure changes the filing cabinet, not the spirit:

- **Fall 2026** contains September's Cozy Fall Kickoff, October's Halloween Chaos, and November's Discord Friendsgiving.
- **Winter 2026–27** carries December's Holiday Chaos and January's We Survived wrap-up.
- The passport never resets; Fall and Winter stamps stack into one lifetime collection and can be viewed by season.
- `/event-guide` keeps the upcoming automated schedule and the core promise visible inside Discord.
- The bot automatically posts prompts, bingo-style check-ins, trivia and answer reveals, photo activities, superlative nominations, a free digital Secret Santa activity, movie/game-night prompts, and wrap-up awards nominations. The group still chooses whether and when to turn a movie/game prompt into a live gathering; asynchronous replies always count.
- Halloween movie night, holiday movie night, and January game night use native Discord polls. Members select every workable date; after the date poll closes, the bot posts a time poll and then summarizes the leading date/time. Ties stay visible, and every poll includes an asynchronous/cannot-attend-live option.
- Participation remains free, casual, mostly asynchronous, and optional. Late replies, limited participation, lurking, and returning after an absence are all valid; there are no leaderboards or purchase requirements.

## Cloudflare resources

- Worker: `seasons-of-chaos`
- D1 binding: `DB`
- D1 database: `fall-into-chaos` (original internal resource name; shared by every season)
- Production URL: `https://seasons-of-chaos.v-martinez1.workers.dev`
- Region: Eastern North America
- Secrets: `DISCORD_PUBLIC_KEY`, `DISCORD_TOKEN`

The Discord application's **Interactions Endpoint URL** must be the production Worker URL.

## Local setup

Requirements: Node.js 20+, an authenticated Cloudflare account, and a Discord application.

```bash
npm install
cp .env.example .env
npm run db:migrate:local
npm run dev
```

Enter the Discord development values in `.env`. Never commit that file. Wrangler uses local D1 state for development; normal Discord testing should use the deployed Worker because Discord cannot reach localhost directly.

## Deploy changes

After changing application code:

```bash
npm run check
npm run deploy
```

After adding a migration:

```bash
npm run db:migrate:remote
npm run deploy
```

After changing slash-command definitions:

```bash
npm run deploy:commands
```

Generate binding types after changing `wrangler.jsonc`:

```bash
npx wrangler types worker-configuration.d.ts
npx wrangler types --check
```

## Stamp catalog

The initial catalog lives in `migrations/0001_initial.sql`. Seasons, stamp mappings, and rewards are introduced in `migrations/0002_seasons_and_rewards.sql`. The catalog in `src/config/stamps.ts` remains a readable source list, but D1 is authoritative at runtime.

Stamps without a `stamp_seasons` mapping are lifetime-global. Seasonal stamps can be filtered in `/passport` without changing or resetting the lifetime award history. Rewards can use a seasonal threshold or a lifetime threshold and may later include a Discord role ID.

For future changes, create a new numbered migration instead of editing one that has already run:

```bash
npx wrangler d1 migrations create DB add-new-stamps
```

Use a stable slug for every stamp. Changing a slug creates a different achievement and can disconnect existing award history.

## Secrets

Upload the Discord verification key with:

```bash
npx wrangler secret put DISCORD_PUBLIC_KEY
```

Do not place secrets in `wrangler.jsonc`, source files, or GitHub. The production Worker uses the bot token to scan configured channels and announce automatic awards.

## Verification and operations

```bash
curl https://seasons-of-chaos.v-martinez1.workers.dev
npx wrangler d1 execute DB --remote --command "SELECT COUNT(*) FROM stamps"
npx wrangler secret list
npx wrangler tail seasons-of-chaos
```

Cloudflare observability is enabled with structured error logging. D1 enforces unique guild/user/stamp awards, preventing duplicate awards even across simultaneous requests.

## Project structure

```text
migrations/                    Versioned D1 schema, seasons, rewards, and stamps
src/worker.ts                 Signed Discord interaction handler
src/d1-repository.ts          D1 passport queries
src/cloudflare-types.ts       Discord payload and database row types
src/commands.ts               Slash-command definitions
src/deploy-commands.ts        Discord command registration
worker-configuration.d.ts     Generated Cloudflare types
wrangler.jsonc                Worker, D1, and observability config
```

## GitHub

GitHub is recommended for source backup and deployment history, but is not required for the live Worker. Before publishing, confirm `.env`, local D1 state, and SQLite files remain ignored. Cloudflare can later connect to the repository for automatic deployments from the main branch.
