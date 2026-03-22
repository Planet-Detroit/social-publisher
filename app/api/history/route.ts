import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb, ensureTables } from '@/lib/db';

export async function GET() {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureTables();
    const sql = getDb();
    const rows = await sql`
      SELECT article_url, article_title, image_url, platforms, published_at
      FROM publish_history
      ORDER BY published_at DESC
      LIMIT 20
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Failed to load history:', err);
    return NextResponse.json([]);
  }
}
