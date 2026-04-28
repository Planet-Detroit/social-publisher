import { NextRequest, NextResponse } from 'next/server';
import { getDb, ensureTables } from '@/lib/db';

// List scheduled posts (upcoming first, then recent published)
export async function GET() {

  try {
    await ensureTables();
    const sql = getDb();
    const rows = await sql`
      SELECT id, article_url, article_title, image_url, posts, platforms,
             scheduled_at, platform_times, status, publish_results, created_at
      FROM scheduled_posts
      ORDER BY
        CASE WHEN status = 'scheduled' THEN 0 ELSE 1 END,
        scheduled_at DESC
      LIMIT 30
    `;
    return NextResponse.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('List scheduled error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Cancel a scheduled post
export async function DELETE(req: NextRequest) {

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  try {
    await ensureTables();
    const sql = getDb();
    const result = await sql`
      DELETE FROM scheduled_posts
      WHERE id = ${id} AND status = 'scheduled'
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Post not found or already published' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Cancel scheduled error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
