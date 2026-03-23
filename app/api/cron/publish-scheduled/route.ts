import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureTables } from '@/lib/db';
import { publishPosts } from '@/lib/social';

// Vercel Cron calls this every minute to publish due posts
export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureTables();
    const sql = getDb();

    // Find posts that are due to publish
    const duePosts = await sql`
      SELECT id, posts, platforms, image_url, platform_images,
             platform_times, article_url, article_title
      FROM scheduled_posts
      WHERE status = 'scheduled' AND scheduled_at <= NOW()
    `;

    if (duePosts.length === 0) {
      return NextResponse.json({ published: 0 });
    }

    let publishedCount = 0;

    for (const post of duePosts) {
      // Mark as publishing to prevent double-publish
      await sql`
        UPDATE scheduled_posts SET status = 'publishing' WHERE id = ${post.id}
      `;

      try {
        const platforms = post.platforms as string[];
        const posts = post.posts as Record<string, string>;
        const imageUrl = post.image_url as string | null;
        const platformImages = (post.platform_images || {}) as Record<string, string>;
        const platformTimes = (post.platform_times || {}) as Record<string, string>;

        // If there are per-platform time overrides, only publish platforms
        // whose scheduled time has arrived
        const now = new Date();
        const readyPlatforms = platforms.filter(p => {
          if (platformTimes[p]) {
            return new Date(platformTimes[p]) <= now;
          }
          return true; // No override = use the shared time (already checked)
        });

        const pendingPlatforms = platforms.filter(p => {
          if (platformTimes[p]) {
            return new Date(platformTimes[p]) > now;
          }
          return false;
        });

        if (readyPlatforms.length === 0) {
          // No platforms ready yet, revert to scheduled
          await sql`
            UPDATE scheduled_posts SET status = 'scheduled' WHERE id = ${post.id}
          `;
          continue;
        }

        const results = await publishPosts(posts, readyPlatforms, imageUrl, platformImages);

        if (pendingPlatforms.length > 0) {
          // Some platforms still pending — keep as scheduled with partial results
          await sql`
            UPDATE scheduled_posts
            SET status = 'scheduled',
                platforms = ${JSON.stringify(pendingPlatforms)},
                publish_results = ${JSON.stringify(results)}
            WHERE id = ${post.id}
          `;
        } else {
          // All done
          await sql`
            UPDATE scheduled_posts
            SET status = 'published', publish_results = ${JSON.stringify(results)}
            WHERE id = ${post.id}
          `;

          // Also save to publish history
          await sql`
            INSERT INTO publish_history (article_url, article_title, image_url, platforms)
            VALUES (${post.article_url}, ${post.article_title}, ${imageUrl}, ${JSON.stringify(results)})
          `;
        }

        publishedCount++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Failed to publish scheduled post ${post.id}:`, message);
        await sql`
          UPDATE scheduled_posts
          SET status = 'failed', publish_results = ${JSON.stringify({ error: message })}
          WHERE id = ${post.id}
        `;
      }
    }

    return NextResponse.json({ published: publishedCount, total: duePosts.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Cron publish error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
