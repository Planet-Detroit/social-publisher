import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { publishPosts } from '@/lib/social';

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { posts, platforms, imageUrl, articleUrl } = await req.json();
  if (!posts || !platforms || !platforms.length) {
    return NextResponse.json({ error: 'Posts and platforms are required' }, { status: 400 });
  }

  try {
    const results = await publishPosts(posts, platforms, imageUrl || null);

    // Save to history
    const historyEntry = {
      articleUrl,
      imageUrl,
      platforms: results,
      publishedAt: new Date().toISOString(),
    };

    // Store in a simple JSON file (replace with database later)
    const fs = await import('fs');
    const path = await import('path');
    const historyPath = path.join(process.cwd(), 'data', 'history.json');

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    let history: typeof historyEntry[] = [];
    if (fs.existsSync(historyPath)) {
      try { history = JSON.parse(fs.readFileSync(historyPath, 'utf-8')); } catch { history = []; }
    }

    history.unshift(historyEntry);
    // Keep last 100 entries
    if (history.length > 100) history = history.slice(0, 100);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

    return NextResponse.json({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error publishing:', message);
    return NextResponse.json({ error: `Failed to publish: ${message}` }, { status: 500 });
  }
}
