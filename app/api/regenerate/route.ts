import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { isAuthenticated } from '@/lib/auth';

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  instagram: 'Instagram caption with relevant hashtags (include #PlanetDetroit #Detroit #Michigan). End with the URL.',
  facebook: 'Facebook post (2-3 short paragraphs, informative). Include the URL.',
  twitter: 'MUST be under 250 characters total INCLUDING the URL. Very concise — one punchy sentence plus the URL. Do NOT include hashtags.',
  bluesky: 'MUST be under 270 characters total INCLUDING the URL. One or two short sentences plus the URL.',
  linkedin: 'Professional post for LinkedIn (2-3 paragraphs, highlight significance and community relevance). Include the URL.',
};

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
  }

  const { platform, title, body, url, subtitle, excerpt } = await req.json();
  if (!platform || !title) {
    return NextResponse.json({ error: 'Platform and title are required' }, { status: 400 });
  }

  const instruction = PLATFORM_INSTRUCTIONS[platform];
  if (!instruction) {
    return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 });
  }

  try {
    const client = new Anthropic();

    // Prioritize subtitle and excerpt as source material
    const hasSubtitle = subtitle && subtitle.trim();
    const hasExcerpt = excerpt && excerpt.trim();
    const hasEditorialSummary = hasSubtitle || hasExcerpt;

    let sourceSection = `- Headline: ${title}`;
    if (hasEditorialSummary) {
      if (hasSubtitle) sourceSection += `\n- Subtitle: ${subtitle}`;
      if (hasExcerpt) sourceSection += `\n- Summary: ${excerpt}`;
      sourceSection += `\n\nBase your post strictly on the headline, subtitle, and summary above. These are the editor-approved descriptions. Do not invent details beyond what is provided.`;
    } else {
      sourceSection += `\n- Content: ${(body || '').substring(0, 3000)}`;
    }

    const prompt = `Generate a single social media post for ${platform} about this article.

ARTICLE DETAILS:
${sourceSection}
${url ? `- URL: ${url}` : ''}

INSTRUCTIONS: ${instruction}
${url ? `Include this URL in the post: ${url}` : ''}

Return ONLY the post text, no JSON, no quotes, no explanation.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: "You are a social media writer for Planet Detroit, an independent environmental journalism nonprofit in Metro Detroit. Write in a journalistic voice — informative, clear, and credible. You are NOT an advocacy organization. Never use celebratory or activist language like 'We won!', 'Victory!', 'Fight for', 'Join the movement', etc. Tone: professional but approachable, like a trusted local newsroom. Return ONLY the post text.",
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (message.content[0] as { text: string }).text.trim();
    return NextResponse.json({ platform, text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to regenerate: ${msg}` }, { status: 500 });
  }
}
