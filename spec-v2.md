# Feature Spec: Social Publisher v2 Enhancements

**Date**: 2026-03-22
**Status**: Draft

---

## 1. Purpose

Enhance the Social Publisher with scheduling, image management, drafts, and workflow improvements to fully replace Buffer as Planet Detroit's social media tool.

---

## 2. New Features

### A. Post Scheduling

Allow posts to be scheduled for future publication instead of only "publish now."

**User workflow:**
1. After generating posts, user sees two options: "Publish Now" and "Schedule"
2. For scheduling, a shared date/time picker sets the default time for all platforms
3. User can optionally override the time per platform (e.g., Instagram at 9am, X at noon)
4. Scheduled posts are saved and a server-side job publishes them at the scheduled time
5. User can view, edit, or cancel scheduled posts

**Requirements:**
- Shared date/time picker (defaults to Eastern time)
- Per-platform time override (optional)
- Scheduled posts stored in database (Vercel Postgres or similar)
- Background job checks every minute for posts due to publish
- Scheduled posts page showing upcoming and past scheduled posts
- Cancel/edit/publish-now actions on scheduled posts

---

### B. Image Management

Allow uploading custom images and swapping/adding images beyond the auto-fetched article image.

**User workflow:**
1. After fetching an article, the article's featured image is shown as default
2. User can click "Change Image" to upload a different image from their computer
3. User can click "Add Image" to add additional images (for platforms that support multi-image, though we'll start with single image)
4. Uploaded images are stored temporarily for the session (or in cloud storage for scheduled posts)
5. Image preview updates in all platform cards when changed

**Requirements:**
- File upload input accepting JPG, PNG, WebP
- Image preview with swap/remove controls
- Uploaded images stored in Vercel Blob or similar for scheduled posts
- Max file size: 5MB
- Image persists through the publish flow

---

### C. Post Without a URL

Allow creating standalone social posts not tied to an article.

**User workflow:**
1. Instead of pasting a URL, user clicks "Create Post" (or leaves URL empty)
2. User types or pastes their own text into a content field
3. User can optionally upload an image
4. Clicks "Generate Posts" — Claude adapts the text for each platform
5. Or user can skip generation and manually write each platform's post

**Requirements:**
- Toggle or tab: "From Article" (paste URL) vs "Create Post" (freeform)
- Freeform text input area
- Optional image upload
- "Generate Posts" uses the freeform text as source material
- "Skip to editing" option to manually write each platform's post

---

### D. Draft Saving

Save generated posts to come back to later before publishing.

**User workflow:**
1. After generating posts, user can click "Save Draft" instead of publishing
2. Drafts appear in a "Drafts" section on the main page
3. User can click a draft to reload it — article info, posts, and image are restored
4. User edits and publishes when ready
5. Drafts auto-delete after 30 days

**Requirements:**
- Drafts stored in database (Vercel Postgres)
- Draft includes: article URL, title, image URL, all platform post texts, created date
- Drafts section on main page showing saved drafts
- Load draft restores full state
- Delete draft action
- Auto-cleanup of drafts older than 30 days

---

### E. Regenerate Single Platform

Re-generate just one platform's post without regenerating all five.

**User workflow:**
1. On any platform preview card, user clicks a "Regenerate" button
2. Only that platform's post is regenerated using Claude
3. Other platforms' posts are unchanged

**Requirements:**
- "Regenerate" button on each platform card (next to Edit/Copy)
- API call sends only the target platform + article context
- Response updates only that platform's post text
- Character limit instructions still enforced per platform

---

### F. Select All / Publish All

Quick action to select all platforms and publish.

**User workflow:**
1. A "Select All" checkbox above the platform cards checks all platforms at once
2. "Deselect All" unchecks them all
3. Publish button publishes to all selected platforms

**Requirements:**
- "Select All / Deselect All" toggle above the cards grid
- Publish button text updates with count

---

### G. Emoji Support

Allow adding emoji to posts easily.

**User workflow:**
1. When editing a post, user can insert emoji using their OS emoji picker (Ctrl+Cmd+Space on Mac)
2. Emoji display correctly in preview cards
3. Emoji are included in published posts

**Requirements:**
- No special implementation needed — OS emoji picker works with standard text inputs
- Ensure emoji render correctly in preview text
- Note in UI: "Tip: Press Ctrl+Cmd+Space to add emoji" (Mac) or similar hint

---

## 3. Database Requirements

Scheduling and drafts require persistent storage. Options:

**Recommended: Vercel Postgres**
- Free tier: 256MB storage, 60 compute hours/month
- Tables needed:
  - `scheduled_posts` — id, article_url, image_url, posts (JSONB), platform_times (JSONB), status, created_at
  - `drafts` — id, article_url, article_title, image_url, posts (JSONB), created_at

**Alternative: Vercel KV (Redis)**
- Simpler but less structured
- Good for drafts, awkward for scheduled posts queries

---

## 4. Implementation Status

1. **Select All + Regenerate Single** — DONE
2. **Post Without URL (freeform mode)** — DONE
3. **Database setup (Neon Postgres)** — DONE
4. **Draft Saving** — DONE
5. **Publish History** — DONE
6. **Image Upload/Swap** — TODO (needs Vercel Blob for storage)
7. **Post Scheduling** — TODO (needs Vercel Cron for background jobs)

---

## 5. Acceptance Criteria

### Scheduling
- [ ] When user clicks "Schedule", then a date/time picker appears
- [ ] When user sets a shared time, then all platforms default to that time
- [ ] When user overrides a platform's time, then only that platform uses the override
- [ ] When the scheduled time arrives, then posts are published automatically
- [ ] When user views scheduled posts, then they see upcoming posts with edit/cancel options

### Image Management
- [ ] When user clicks "Change Image", then a file picker opens
- [ ] When user uploads an image, then preview cards update with the new image
- [ ] When user removes the image, then posts publish without an image
- [ ] When image exceeds 5MB, then an error message is shown

### Post Without URL
- [ ] When user clicks "Create Post", then a freeform text input appears
- [ ] When user enters text and clicks "Generate", then platform posts are generated from that text
- [ ] When user skips generation, then empty platform cards appear for manual editing

### Draft Saving
- [ ] When user clicks "Save Draft", then current state is saved
- [ ] When user clicks a saved draft, then full state is restored
- [ ] When user deletes a draft, then it is removed
- [ ] When a draft is older than 30 days, then it is auto-deleted

### Regenerate Single Platform
- [ ] When user clicks "Regenerate" on a platform card, then only that post is regenerated
- [ ] When one post is regenerated, then other platforms' posts are unchanged

### Select All
- [ ] When user clicks "Select All", then all platform checkboxes are checked
- [ ] When user clicks "Deselect All", then all checkboxes are unchecked

---

## 6. Out of Scope (for now)

- Multi-image posts (start with single image per post)
- Tagging/mentioning other accounts from the UI
- Post analytics/engagement tracking
- Recurring/repeating schedules
- Post templates or saved prompts
- Thread/carousel creation

---

_Build in priority order: Select All + Regenerate first (no database), then database setup, then drafts, then image upload, then scheduling._
