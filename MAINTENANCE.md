# Social Publisher — Maintenance Guide

## What This Tool Does

A web app for generating and publishing social media posts across multiple platforms. Replaces Buffer for Planet Detroit's social media workflow.

**Two modes:**
- **From Article** — Paste a URL, fetch the content, generate platform-specific posts
- **Create Post** — Write freeform text, generate platform-specific versions

**Platforms:** Bluesky (direct), X/Twitter (direct), Facebook (direct), Instagram (direct), LinkedIn (via Zernio)

## How to Tell If It's Working

1. You can log in at `social.tools.planetdetroit.org`
2. Pasting a Planet Detroit URL fetches the article title, description, and image
3. Clicking "Generate Social Posts" creates posts for all 5 platforms
4. Clicking "Publish Now" posts to selected platforms and shows green success messages
5. Published posts appear in the Recent Posts history section
6. Saved drafts appear in the Saved Drafts section

## Tech Stack

- **Framework:** Next.js (TypeScript, Tailwind CSS)
- **Hosting:** Vercel
- **Database:** Neon Postgres (via Vercel Storage)
- **AI:** Anthropic Claude API (post generation)
- **Social APIs:** Direct platform APIs (same as planet-detroit-events)

## Environment Variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `ADMIN_PASSWORD` | Login password |
| `ANTHROPIC_API_KEY` | Claude API for post generation (shared via Vercel team) |
| `BLUESKY_HANDLE` | Bluesky account handle |
| `BLUESKY_APP_PASSWORD` | Bluesky app password |
| `TWITTER_API_KEY` | X Consumer Key |
| `TWITTER_API_SECRET` | X Consumer Secret |
| `TWITTER_ACCESS_TOKEN` | X Access Token |
| `TWITTER_ACCESS_SECRET` | X Access Token Secret |
| `FACEBOOK_PAGE_ID` | Facebook Page ID |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Permanent Page Access Token |
| `INSTAGRAM_ACCOUNT_ID` | Instagram Business Account ID |
| `LATE_API_KEY` | Zernio API key (LinkedIn only) |
| `DATABASE_URL` | Neon Postgres (auto-set by Vercel) |

## Common Problems and Fixes

### Posts generate but don't publish
- Check Vercel logs (Vercel > project > Logs tab) for error messages
- Most likely: an API key is missing or expired
- X/Twitter: may need to buy more credits at developer.x.com ($5 minimum)

### Facebook/Instagram publishing fails
- The Page Access Token may have been revoked
- Follow the token refresh process in `/Users/user/projects/planet-detroit-events/SOCIAL-PUBLISHING.md` under "Token Maintenance"

### "Failed to generate posts"
- Check that `ANTHROPIC_API_KEY` is set in Vercel (or shared via team env vars)
- Check Vercel logs for the specific Claude API error

### Drafts or history not showing
- Check that the Neon database is connected (Vercel > Storage tab)
- Tables are auto-created on first request — no manual migration needed

### X posts over character limit
- The Claude prompt enforces limits but isn't perfect
- Edit the post manually before publishing — character count shows in real time
- Click "Regenerate" on just the X card to get a new version

## Project Structure

```
app/
  page.tsx          — Main UI (input, preview cards, publish, drafts, history)
  login/page.tsx    — Password login
  layout.tsx        — Layout with ToolNav
  api/
    auth/           — Login/logout/session check
    fetch-url/      — URL content extraction (WordPress API + Open Graph)
    generate/       — Claude post generation (all platforms)
    regenerate/     — Claude single-platform regeneration
    publish/        — Platform publishing + history save
    drafts/         — Draft CRUD (save, list, delete)
    history/        — Publish history list
components/
  ToolNav.tsx       — PD Tools navigation bar
lib/
  auth.ts           — Cookie-based session auth
  db.ts             — Neon Postgres connection + table setup
  social/           — Platform publishing services
    index.ts        — Unified publisher
    bluesky.ts      — AT Protocol
    twitter.ts      — X API v2
    facebook.ts     — Graph API
    instagram.ts    — Graph API
    linkedin.ts     — Zernio fallback
```

## Dependencies

- **Neon Postgres** — Drafts and publish history
- **Anthropic Claude API** — Post generation
- **Bluesky AT Protocol** — Direct posting (free)
- **X/Twitter API v2** — Direct posting (~$0.01/tweet)
- **Facebook Graph API** — Page photo posts (free)
- **Instagram Graph API** — Container-based publishing (free)
- **Zernio** — LinkedIn posting (temporary, $19/month)
