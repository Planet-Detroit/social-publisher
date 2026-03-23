# Social Publisher — Maintenance Guide

## What This Tool Does

A web app for generating and publishing social media posts across multiple platforms. Replaces Buffer for Planet Detroit's social media workflow.

**Three modes:**
- **From Article** — Paste a URL, fetch the content, generate platform-specific posts
- **Create Post** — Write freeform text with emoji picker, generate platform-specific versions
- **Schedule** — Queue posts for future automatic publication

**Platforms:** Bluesky (direct), X/Twitter (direct), Facebook (direct), Instagram (direct), LinkedIn (via Zernio)

## How to Tell If It's Working

1. You can log in at the Social Publisher URL
2. Pasting a Planet Detroit URL fetches the article title, description, and image
3. Clicking "Generate Social Posts" creates posts for all 5 platforms
4. Clicking "Publish Now" posts to selected platforms and shows green success messages
5. Clicking "Schedule" lets you pick a date/time for future publishing
6. Scheduled posts appear in the Scheduled Posts section and publish automatically
7. Published posts appear in the Recent Posts section (last 20)
8. Saved drafts appear in the Saved Drafts section

## Features

### Image Management
- **Article mode:** Featured image is fetched automatically from the article
- **Change Image:** Upload a custom JPG, PNG, or WebP (max 5MB) to replace the default
- **Per-platform swap:** Hover over any platform card's image and click "Swap" to use a different image for just that platform
- **Freeform mode:** Click "Add Image" to attach an image to a standalone post

### Post Scheduling
- Click "Schedule" next to "Publish Now" to open the date/time picker
- Select a future date and time (in your local timezone)
- Posts are automatically published at the scheduled time (checked every minute)
- View, cancel, or track scheduled posts in the "Scheduled Posts" section
- Failed scheduled posts show an error status

### Emoji Support
- In Create Post mode, click the 😀 button to open the emoji picker
- Emoji inserts at your cursor position
- You can also use your OS emoji picker (Ctrl+Cmd+Space on Mac)

## Tech Stack

- **Framework:** Next.js (TypeScript, Tailwind CSS)
- **Hosting:** Vercel
- **Database:** Neon Postgres (drafts, history, scheduled posts)
- **Storage:** Vercel Blob (uploaded images)
- **AI:** Anthropic Claude API (post generation)
- **Cron:** Vercel Cron (scheduled post publishing, every minute)
- **Social APIs:** Direct platform APIs

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
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for image uploads (auto-set by Vercel) |
| `CRON_SECRET` | Secures the cron endpoint (auto-set by Vercel) |

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

### Scheduled posts not publishing
- Check Vercel > project > Settings > Cron Jobs to confirm the cron is active
- Vercel Hobby plan: cron runs once per day. Pro plan: every minute. You need Pro for reliable scheduling.
- Check Vercel logs for errors in `/api/cron/publish-scheduled`
- If `CRON_SECRET` is set, ensure it matches what Vercel sends

### Image upload fails
- Verify `BLOB_READ_WRITE_TOKEN` is set (check Vercel > Storage > Blob)
- Max file size is 5MB
- Accepted formats: JPG, PNG, WebP only

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
  page.tsx              — Main UI (input, preview cards, publish, schedule, drafts, history)
  login/page.tsx        — Password login
  layout.tsx            — Layout with ToolNav
  api/
    auth/               — Login/logout/session check
    fetch-url/          — URL content extraction (WordPress API + Open Graph)
    generate/           — Claude post generation (all platforms)
    regenerate/         — Claude single-platform regeneration
    publish/            — Platform publishing + history save
    schedule/           — Create scheduled posts
    scheduled/          — List/cancel scheduled posts
    cron/
      publish-scheduled/ — Vercel Cron handler (publishes due posts)
    upload/             — Image upload to Vercel Blob
    drafts/             — Draft CRUD (save, list, delete)
    history/            — Publish history list
components/
  ToolNav.tsx           — PD Tools navigation bar
lib/
  auth.ts               — Cookie-based session auth
  db.ts                 — Neon Postgres connection + table setup (3 tables)
  social/               — Platform publishing services
    index.ts            — Unified publisher (supports per-platform images)
    bluesky.ts          — AT Protocol
    twitter.ts          — X API v2
    facebook.ts         — Graph API
    instagram.ts        — Graph API
    linkedin.ts         — Zernio fallback
vercel.json             — Cron job configuration
```

## Database Tables

- **drafts** — Saved post drafts (auto-cleanup after 30 days)
- **publish_history** — Record of published posts (last 20 shown)
- **scheduled_posts** — Queued posts with status tracking (scheduled/publishing/published/failed)

## Dependencies

- **Neon Postgres** — Drafts, publish history, scheduled posts
- **Vercel Blob** — Uploaded image storage
- **Vercel Cron** — Scheduled post publishing
- **Anthropic Claude API** — Post generation
- **Bluesky AT Protocol** — Direct posting (free)
- **X/Twitter API v2** — Direct posting (~$0.01/tweet)
- **Facebook Graph API** — Page photo posts (free)
- **Instagram Graph API** — Container-based publishing (free)
- **Zernio** — LinkedIn posting (temporary, $19/month)
