import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { publishPosts } from '@/lib/social';

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { posts, platforms, imageUrl } = await req.json();
  if (!posts || !platforms || !platforms.length) {
    return NextResponse.json({ error: 'Posts and platforms are required' }, { status: 400 });
  }

  try {
    const results = await publishPosts(posts, platforms, imageUrl || null);
    return NextResponse.json({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error publishing:', message);
    return NextResponse.json({ error: `Failed to publish: ${message}` }, { status: 500 });
  }
}
