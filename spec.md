# Feature Spec: Social Publisher

**Date**: 2026-03-22
**Status**: Draft

---

## 1. Purpose

A standalone tool that replaces Buffer for Planet Detroit's social media workflow. The user pastes any article URL, the tool fetches the content and generates platform-specific social posts using AI with Planet Detroit's journalistic voice, then publishes directly to Bluesky, X/Twitter, Facebook, Instagram, and LinkedIn — with images, character counts, and preview cards. Unlike the events app's built-in social posting (which only handles events), this tool handles any Planet Detroit article or external link the team wants to share.

---

## 2. Users

- **Primary user**: Dustin (managing editor) and Nina (founder)
- **How they'll access it**: Via PD Tools nav bar at `https://social.tools.planetdetroit.org/`
- **How often they'll use it**: 3-5 times per week (whenever publishing or sharing articles)

---

## 3. User Workflow

1. User navigates to the Social Publisher via the PD Tools nav bar
2. User pastes an article URL (Planet Detroit or external) into the input field
3. The tool fetches the article's headline, body text, and featured image
4. User clicks "Generate Posts" — Claude generates platform-specific posts in a journalistic voice
5. User sees preview cards styled like each platform (Bluesky, X, Facebook, Instagram, LinkedIn) with the article image, character counts, and editable text
6. User reviews and edits any posts as needed
7. User checks the platforms they want to publish to (all unchecked by default)
8. User clicks "Publish" — posts go directly to each platform's API
9. User sees per-platform success/error status
10. Posts are saved to a history log so the team can see what was published

---

## 4. Requirements

### URL Fetching
1. Accept any URL (Planet Detroit articles, external news articles, press releases, etc.)
2. Extract headline, body text, and featured image from the URL
3. Handle paywalled sites gracefully — use available meta tags and Open Graph data when full text isn't accessible
4. For planetdetroit.org URLs, fetch full content via WordPress REST API

### Post Generation
5. Generate posts for 5 platforms: Bluesky, X/Twitter, Facebook, Instagram, LinkedIn
6. Use journalistic voice — informative, clear, credible. Never advocacy language ("We won!", "Victory!", "Fight for", "Join the movement")
7. Include the article URL in every post
8. Respect character limits: X under 250 chars (with URL), Bluesky under 270 chars (with URL)
9. Instagram posts should include relevant hashtags (#PlanetDetroit #Detroit #Michigan)
10. LinkedIn posts should be 2-3 paragraphs with professional tone
11. Facebook posts should be detailed event/article descriptions

### Preview & Editing
12. Show platform-styled preview cards with the article image, author avatar, and handle
13. Display character count with over-limit warnings for X and Bluesky
14. Allow inline editing of any post before publishing
15. Copy button on each card for manual posting
16. All platforms unchecked by default — user must explicitly select which to publish

### Publishing
17. Publish directly via platform APIs (same services as planet-detroit-events):
    - Bluesky: AT Protocol with image upload and aspect ratio
    - X/Twitter: API v2 with v1 media upload
    - Facebook: Graph API photo posts
    - Instagram: Graph API two-step container publish
    - LinkedIn: Zernio fallback (until Community Management API is approved)
18. Upload article's featured image with each post
19. Show per-platform publish results (success/error/skipped)

### History
20. Save published posts to a database with: URL, platform, post text, publish date, status
21. Show recent history on the main page so the team can see what's been shared

### Authentication & Navigation
22. Password-protected (same pattern as other PD tools)
23. PD Tools nav bar with links to Brief Generator, Newsletter Builder, Civic Action, Events, Social Publisher

---

## 5. Acceptance Criteria

### URL Fetching
- [ ] When user pastes a planetdetroit.org URL, then the headline, body, and featured image are extracted via WordPress API
- [ ] When user pastes an external URL (e.g., freep.com), then Open Graph/meta tags are used to extract headline, description, and image
- [ ] When user pastes an invalid URL, then a clear error message is shown
- [ ] When the URL has no image, then posts are generated without image and the preview shows no image

### Post Generation
- [ ] When user clicks "Generate Posts", then 5 platform-specific posts are created
- [ ] When posts are generated, then X post is under 250 characters including the URL
- [ ] When posts are generated, then Bluesky post is under 270 characters including the URL
- [ ] When posts are generated, then no post contains advocacy language
- [ ] When posts are generated, then every post includes the article URL
- [ ] When posts are generated, then Instagram post includes #PlanetDetroit hashtag

### Preview & Editing
- [ ] When posts are generated, then preview cards show with platform icons, colors, and character counts
- [ ] When user edits post text, then the character count updates in real time
- [ ] When X post exceeds 250 characters, then the counter turns red
- [ ] When user clicks "Copy", then the post text is copied to clipboard
- [ ] When page loads, then all platform checkboxes are unchecked

### Publishing
- [ ] When user publishes to Bluesky, then post appears on Bluesky with correct image and aspect ratio
- [ ] When user publishes to X, then tweet appears with image
- [ ] When user publishes to Facebook, then post appears on Planet Detroit Facebook page with image
- [ ] When user publishes to Instagram, then post appears with image and caption
- [ ] When user publishes to LinkedIn with Zernio key set, then post is created via Zernio
- [ ] When a platform publish fails, then the error message is shown and other platforms still publish
- [ ] When no platforms are selected, then the publish button is hidden

### History
- [ ] When posts are published, then they appear in the history section with URL, platforms, and date
- [ ] When user visits the page, then the 20 most recent published posts are shown

---

## 6. Out of Scope

- This tool does NOT schedule posts for future publishing (publish now only)
- This tool does NOT support video content
- This tool does NOT support multi-image posts (one image per post)
- This tool does NOT auto-detect when a new article is published (manual URL paste only)
- This tool does NOT manage comments or engagement on published posts
- This tool does NOT replace the events app's built-in social posting (that stays for event-specific posts)
- This tool does NOT provide analytics on post performance

---

## 7. Connects To

- **Anthropic Claude API** — Post generation (claude-sonnet-4-5-20250929)
- **Bluesky AT Protocol** — Direct posting via @atproto/api
- **X/Twitter API v2** — Direct posting via twitter-api-v2
- **Facebook Graph API** — Page photo posts
- **Instagram Graph API** — Container-based publishing
- **Zernio API** — LinkedIn posting (temporary, until direct API approved)
- **WordPress REST API** — Fetching Planet Detroit article content
- **planet-detroit-events** — Shares the same `server/services/social/` publishing code (can be extracted into a shared package or copied)

---

## 8. Known Risks

- **If Facebook/Instagram token expires**: Publishing to those platforms will fail. Token is currently permanent (Page token), but if Meta revokes it or permissions change, it needs to be regenerated via the Graph API Explorer flow documented in SOCIAL-PUBLISHING.md.
- **If X credits run out**: X posting will return a 402 error. Need to buy more credits at developer.x.com ($5 minimum, ~500 tweets).
- **If article URL is inaccessible**: The tool falls back to Open Graph meta tags, which may provide limited text. Generated posts will be based on whatever content is available — may need more manual editing.
- **If tool goes down**: Team can still copy post text from any text editor and post manually. No data is lost.
- **Security considerations**: API keys stored as environment variables on Vercel/Railway. Admin password protects access. No user data is collected.
- **Content accuracy**: AI-generated posts could misrepresent article content. The preview/edit step is the safety net — team must review before publishing. This is a journalism organization; wrong information is a reputational risk.

---

## 9. Success Metrics

- Team uses the tool instead of manually writing and posting to each platform
- Time to share an article across all platforms drops from ~15 minutes to ~2 minutes
- Posts are consistently on-brand (journalistic voice, not advocacy)
- No manual posting to Bluesky, X, Facebook, or Instagram after the tool is live

---

## 10. Tech Stack

- **Framework**: Next.js 15 (TypeScript, Tailwind CSS) — matches news-brief-generator and newsletter-builder
- **Deployment**: Vercel at `social.tools.planetdetroit.org`
- **Database**: Vercel KV or Vercel Postgres for post history (lightweight)
- **Auth**: Simple password auth (same pattern as other tools)
- **Social APIs**: Copy `server/services/social/` from planet-detroit-events or extract to shared npm package

---

## 11. File Structure

```
social-publisher/
  src/
    app/
      page.tsx          — Main UI (URL input + preview + publish)
      layout.tsx        — Layout with ToolNav
      login/page.tsx    — Password login
      api/
        auth/           — Login/logout/session
        fetch-url/      — URL content extraction
        generate/       — Claude post generation
        publish/        — Platform publishing
        history/        — Post history CRUD
    components/
      ToolNav.tsx       — PD Tools navigation bar
      UrlInput.tsx      — URL paste + fetch
      PostPreview.tsx   — Platform-styled preview cards
      PublishPanel.tsx  — Platform selection + publish button
      PostHistory.tsx   — Recent post history list
    lib/
      social/           — Platform publishing services (from events app)
        bluesky.ts
        twitter.ts
        facebook.ts
        instagram.ts
        linkedin.ts
        index.ts
      article-fetcher.ts — URL content extraction
  .env.local            — API keys (same as events app)
  package.json
  MAINTENANCE.md
```

---

_After completing this spec, hand it to Claude Code and say: "Read this spec. Write automated tests for each acceptance criterion first, then implement the feature."_
