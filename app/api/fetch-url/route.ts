import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

// Extract article content from a URL using Open Graph tags and meta data
// For planetdetroit.org URLs, uses the WordPress REST API for full content

async function fetchFromWordPress(url: string) {
  try {
    // Extract slug from URL like https://planetdetroit.org/2026/03/article-slug/
    const match = url.match(/planetdetroit\.org\/\d{4}\/\d{2}\/([^/]+)/);
    if (!match) return null;

    const slug = match[1];
    const apiUrl = `https://planetdetroit.org/wp-json/wp/v2/posts?slug=${slug}&_embed`;
    const resp = await fetch(apiUrl);
    if (!resp.ok) return null;

    const posts = await resp.json();
    if (!posts.length) return null;

    const post = posts[0];
    // Strip HTML from content
    const bodyText = (post.content?.rendered || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Get featured image
    const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
    const imageUrl = featuredMedia?.source_url || null;

    return {
      title: post.title?.rendered?.replace(/&#8217;/g, "'").replace(/&#8220;|&#8221;/g, '"').replace(/&amp;/g, '&') || '',
      description: bodyText.substring(0, 500),
      body: bodyText,
      imageUrl,
      source: 'wordpress',
    };
  } catch {
    return null;
  }
}

async function fetchFromOpenGraph(url: string) {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PlanetDetroitBot/1.0)' },
    });
    if (!resp.ok) return null;

    const html = await resp.text();

    // Extract Open Graph and meta tags
    const getTag = (property: string): string | null => {
      const patterns = [
        new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
        new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    const title = getTag('og:title') || getTag('twitter:title') ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';

    const description = getTag('og:description') || getTag('twitter:description') ||
      getTag('description') || '';

    const imageUrl = getTag('og:image') || getTag('twitter:image') || null;

    // Try to extract article body text
    let body = description;
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) {
      body = articleMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 2000);
    }

    return {
      title: title.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
      description: description.replace(/&amp;/g, '&'),
      body: body || description,
      imageUrl,
      source: 'opengraph',
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { url } = await req.json();
  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // Try WordPress API first for PD URLs
  if (url.includes('planetdetroit.org')) {
    const wpData = await fetchFromWordPress(url);
    if (wpData) return NextResponse.json(wpData);
  }

  // Fall back to Open Graph extraction
  const ogData = await fetchFromOpenGraph(url);
  if (ogData) return NextResponse.json(ogData);

  return NextResponse.json({ error: 'Could not extract content from URL' }, { status: 422 });
}
