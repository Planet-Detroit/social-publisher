// Direct X/Twitter posting via API v2
import { TwitterApi } from 'twitter-api-v2';

function getClient(): TwitterApi {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error('Twitter API credentials not configured');
  }
  return new TwitterApi({ appKey: apiKey, appSecret: apiSecret, accessToken, accessSecret });
}

async function loadImageBuffer(imageUrl: string | null): Promise<Buffer | null> {
  if (!imageUrl) return null;
  try {
    const resp = await fetch(imageUrl);
    if (!resp.ok) return null;
    return Buffer.from(await resp.arrayBuffer());
  } catch { return null; }
}

export async function publish(text: string, imageUrl: string | null): Promise<{ status: string; id?: string; reason?: string }> {
  try {
    const client = getClient();
    const tweetOptions: { text: string; media?: { media_ids: [string] } } = { text };

    const imageBuffer = await loadImageBuffer(imageUrl);
    if (imageBuffer) {
      try {
        const mediaId = await client.v1.uploadMedia(imageBuffer, { mimeType: 'image/jpeg' });
        tweetOptions.media = { media_ids: [mediaId] };
      } catch (mediaErr: unknown) {
        const msg = mediaErr instanceof Error ? mediaErr.message : String(mediaErr);
        console.warn('Twitter: image upload failed:', msg);
      }
    }

    const result = await client.v2.tweet(tweetOptions);
    console.log('Twitter: posted successfully');
    return { status: 'published', id: result.data.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Twitter: publish error:', message);
    return { status: 'error', reason: message };
  }
}
