// LinkedIn posting via Zernio fallback (until Community Management API is approved)
const ZERNIO_API = 'https://zernio.com/api/v1';

function apiHeaders() {
  return {
    'Authorization': `Bearer ${process.env.LATE_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function publish(text: string, imageUrl: string | null): Promise<{ status: string; id?: string; reason?: string }> {
  if (!process.env.LATE_API_KEY) return { status: 'skipped', reason: 'LATE_API_KEY not set' };

  try {
    // Get LinkedIn account from Zernio
    const accResp = await fetch(`${ZERNIO_API}/accounts`, { headers: apiHeaders() });
    if (!accResp.ok) return { status: 'error', reason: `Zernio accounts failed: ${accResp.status}` };

    const accData = await accResp.json();
    const accounts = accData.accounts || accData;
    const linkedinAccount = (Array.isArray(accounts) ? accounts : [])
      .find((a: { platform?: string }) => (a.platform || '').toLowerCase() === 'linkedin');

    if (!linkedinAccount) return { status: 'skipped', reason: 'LinkedIn not connected in Zernio' };

    const accountId = linkedinAccount.id || linkedinAccount._id;
    const postBody: Record<string, unknown> = {
      content: text,
      platforms: [{ platform: 'linkedin', accountId }],
      publishNow: true,
    };

    if (imageUrl) {
      postBody.mediaUrls = [imageUrl];
      postBody.mediaItems = [{ url: imageUrl, type: 'image' }];
      postBody.media = [{ url: imageUrl, type: 'image' }];
    }

    const res = await fetch(`${ZERNIO_API}/posts`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(postBody),
    });

    const resText = await res.text();
    let data: Record<string, string>;
    try { data = JSON.parse(resText); } catch { data = {}; }

    if (res.ok) {
      console.log('LinkedIn (Zernio): posted successfully');
      return { status: 'published', id: data.id || data._id };
    }

    return { status: 'error', reason: data.error || data.message || resText.substring(0, 200) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'error', reason: message };
  }
}
