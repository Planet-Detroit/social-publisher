// Direct Facebook Page posting via Graph API
const GRAPH_API = 'https://graph.facebook.com/v21.0';

export async function publish(text: string, imageUrl: string | null): Promise<{ status: string; id?: string; reason?: string }> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageId || !accessToken) return { status: 'error', reason: 'FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN must be set' };

  try {
    let endpoint: string, body: Record<string, string>;

    if (imageUrl) {
      endpoint = `${GRAPH_API}/${pageId}/photos`;
      body = { caption: text, url: imageUrl, access_token: accessToken };
    } else {
      endpoint = `${GRAPH_API}/${pageId}/feed`;
      body = { message: text, access_token: accessToken };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (res.ok) {
      console.log('Facebook: posted successfully');
      return { status: 'published', id: data.post_id || data.id };
    }

    const reason = data.error?.message || JSON.stringify(data.error);
    console.error('Facebook: publish error:', reason);
    return { status: 'error', reason };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'error', reason: message };
  }
}
