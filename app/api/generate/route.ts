import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { isAuthenticated } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
  }

  const { title, body, url } = await req.json();
  if (!title && !body) {
    return NextResponse.json({ error: 'Title or content is required' }, { status: 400 });
  }

  try {
    const client = new Anthropic();

    const hasUrl = url && url.trim();
    const urlInstruction = hasUrl
      ? `IMPORTANT: Include the article URL in every post. The URL is: ${url}\nFor Instagram, put "Link in bio" and include the URL at the end of the caption.`
      : 'No URL to include.';
    const charNote = hasUrl ? ' INCLUDING the URL' : '';

    const prompt = `Generate social media posts for Planet Detroit.

${title ? `HEADLINE: ${title}` : ''}
${hasUrl ? `URL: ${url}` : ''}
CONTENT: ${(body || title || '').substring(0, 3000)}

${urlInstruction}

Return a JSON object with these keys:
- "instagram": Instagram caption with relevant hashtags (include #PlanetDetroit #Detroit #Michigan).${hasUrl ? ' End with the URL.' : ''}
- "facebook": Facebook post (2-3 short paragraphs, informative).${hasUrl ? ' Include the URL.' : ''}
- "twitter": MUST be under 250 characters total${charNote}. Very concise — one punchy sentence${hasUrl ? ' plus the URL' : ''}. Do NOT include hashtags. Count your characters carefully.
- "bluesky": MUST be under 270 characters total${charNote}. One or two short sentences${hasUrl ? ' plus the URL' : ''}. Count your characters carefully.
- "linkedin": Professional post for LinkedIn (2-3 paragraphs, highlight significance and community relevance).${hasUrl ? ' Include the URL.' : ''}

CRITICAL: The twitter post MUST be under 250 characters and the bluesky post MUST be under 270 characters${charNote}. Count every character including spaces, punctuation${hasUrl ? ', and the full URL' : ''}.

Return ONLY the JSON object, no other text.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: "You are a social media writer for Planet Detroit, an independent environmental journalism nonprofit in Metro Detroit. Write in a journalistic voice — informative, clear, and credible. You are NOT an advocacy organization. Never use celebratory or activist language like 'We won!', 'Victory!', 'Fight for', 'Join the movement', etc. Instead, inform the audience about what's happening, why it matters, and how they can participate. Tone: professional but approachable, like a trusted local newsroom. Always return valid JSON only.",
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = (message.content[0] as { text: string }).text;
    let cleaned = responseText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const posts = JSON.parse(cleaned);
    return NextResponse.json(posts);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error generating social posts:', message);
    return NextResponse.json({ error: `Failed to generate posts: ${message}` }, { status: 500 });
  }
}
