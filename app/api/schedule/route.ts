import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb, ensureTables } from '@/lib/db';

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    posts,
    platforms,
    imageUrl,
    platformImages,
    articleUrl,
    articleTitle,
    scheduledAt,
    platformTimes,
  } = await req.json();

  if (!posts || !platforms?.length || !scheduledAt) {
    return NextResponse.json(
      { error: 'Posts, platforms, and scheduledAt are required' },
      { status: 400 }
    );
  }

  // Ensure scheduled time is in the future
  const scheduleDate = new Date(scheduledAt);
  if (scheduleDate <= new Date()) {
    return NextResponse.json(
      { error: 'Scheduled time must be in the future' },
      { status: 400 }
    );
  }

  try {
    await ensureTables();
    const sql = getDb();
    const result = await sql`
      INSERT INTO scheduled_posts (
        article_url, article_title, image_url, platform_images,
        posts, platforms, scheduled_at, platform_times
      )
      VALUES (
        ${articleUrl || null},
        ${articleTitle || null},
        ${imageUrl || null},
        ${JSON.stringify(platformImages || {})},
        ${JSON.stringify(posts)},
        ${JSON.stringify(platforms)},
        ${scheduledAt},
        ${JSON.stringify(platformTimes || {})}
      )
      RETURNING id, scheduled_at, status
    `;

    return NextResponse.json(result[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Schedule error:', message);
    return NextResponse.json({ error: `Failed to schedule: ${message}` }, { status: 500 });
  }
}
