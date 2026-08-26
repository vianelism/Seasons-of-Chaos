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

Administrators and members with **Manage Server** can award and revoke stamps. Additional moderator role IDs can be configured in `wrangler.jsonc` as a comma-separated `MODERATOR_ROLE_IDS` value.

## Automatic Fall 2026 tracking

The Worker checks configured channels once per hour. Use `/setup-channel` once for each channel type you use. A single Discord channel may be selected for more than one type.

- Seasonal conversation awards the monthly participation stamps.
- Photo sharing awards `Pics or It Didn't Happen` when a message contains an attachment.
- Movie-night and game-night activity awards their event stamps.
- Activity on several different days unlocks rule-based secret achievements.
- Participating across September, October, and November unlocks `I Was Here`.
- `/check-in` handles activities the bot cannot infer reliably, such as a costume, seasonal treat, or gratitude post.
- Reward thresholds are evaluated immediately after every automatic or self-service award.

The bot needs **View Channel**, **Read Message History**, and **Send Messages** in tracked channels. A reward with a Discord role also requires **Manage Roles**, and the bot role must sit above the reward role.

After granting **Manage Roles**, run `/setup-rewards` once. The command creates zero-permission cosmetic roles for First Leaves, Certified Cozy, Fall Main Character, and Fall Chaos Legend, connects them to D1, and synchronizes qualifying existing members.

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
