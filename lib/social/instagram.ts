// Direct Instagram posting via Graph API (Content Publishing)
const GRAPH_API = 'https://graph.facebook.com/v21.0';

export async function publish(text: string, imageUrl: string | null): Promise<{ status: string; id?: string; reason?: string }> {
  const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!igAccountId || !accessToken) return { status: 'error', reason: 'INSTAGRAM_ACCOUNT_ID and access token must be set' };
  if (!imageUrl) return { status: 'skipped', reason: 'Instagram requires an image' };

  try {
    // Step 1: Create media container
    const containerRes = await fetch(`${GRAPH_API}/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption: text, access_token: accessToken }),
    });
    const containerData = await containerRes.json();
    if (!containerRes.ok) {
      return { status: 'error', reason: containerData.error?.message || JSON.stringify(containerData.error) };
    }

    // Brief pause for Instagram to process the image
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 2: Publish the container
    const publishRes = await fetch(`${GRAPH_API}/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      return { status: 'error', reason: publishData.error?.message || JSON.stringify(publishData.error) };
    }

    console.log('Instagram: posted successfully');
    return { status: 'published', id: publishData.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'error', reason: message };
  }
}
