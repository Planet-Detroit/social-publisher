import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { publishPosts } from '@/lib/social';
import { getDb, ensureTables } from '@/lib/db';

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { posts, platforms, imageUrl, platformImages, instagramImages, articleUrl, articleTitle } = await req.json();
  if (!posts || !platforms || !platforms.length) {
    return NextResponse.json({ error: 'Posts and platforms are required' }, { status: 400 });
  }

  try {
    const results = await publishPosts(posts, platforms, imageUrl || null, platformImages || {}, instagramImages || []);

    // Save to history
    try {
      await ensureTables();
      const sql = getDb();
      await sql`
        INSERT INTO publish_history (article_url, article_title, image_url, platforms)
        VALUES (${articleUrl || null}, ${articleTitle || null}, ${imageUrl || null}, ${JSON.stringify(results)})
      `;
    } catch (dbErr) {
      console.error('Failed to save history:', dbErr);
      // Don't fail the publish if history save fails
    }

    return NextResponse.json({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error publishing:', message);
    return NextResponse.json({ error: `Failed to publish: ${message}` }, { status: 500 });
  }
}
