import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getDb, ensureTables } from '@/lib/db';

// GET /api/drafts — list saved drafts
export async function GET() {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureTables();
    const sql = getDb();
    const rows = await sql`
      SELECT id, article_url, article_title, image_url, posts, mode, freeform_text, created_at
      FROM drafts
      WHERE created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Failed to load drafts:', err);
    return NextResponse.json([]);
  }
}

// POST /api/drafts — save a new draft
export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { articleUrl, articleTitle, articleBody, imageUrl, posts, mode, freeformText } = await req.json();
  if (!posts) {
    return NextResponse.json({ error: 'Posts are required' }, { status: 400 });
  }

  try {
    await ensureTables();
    const sql = getDb();
    const rows = await sql`
      INSERT INTO drafts (article_url, article_title, article_body, image_url, posts, mode, freeform_text)
      VALUES (${articleUrl || null}, ${articleTitle || null}, ${articleBody || null}, ${imageUrl || null}, ${JSON.stringify(posts)}, ${mode || 'article'}, ${freeformText || null})
      RETURNING id
    `;
    return NextResponse.json({ id: rows[0].id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to save draft: ${message}` }, { status: 500 });
  }
}

// DELETE /api/drafts?id=123 — delete a draft
export async function DELETE(req: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
  }

  try {
    await ensureTables();
    const sql = getDb();
    await sql`DELETE FROM drafts WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to delete draft: ${message}` }, { status: 500 });
  }
}
