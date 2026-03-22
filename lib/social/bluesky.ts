// Direct Bluesky posting via AT Protocol
import { BskyAgent, RichText } from '@atproto/api';

let agent: BskyAgent | null = null;

// Read image dimensions from JPEG or PNG header bytes
function getImageDimensions(data: Uint8Array): { width: number; height: number } | null {
  try {
    if (data[0] === 0xFF && data[1] === 0xD8) {
      let i = 2;
      while (i < data.length - 9) {
        if (data[i] === 0xFF) {
          const marker = data[i + 1];
          if (marker === 0xC0 || marker === 0xC2) {
            return { width: (data[i + 7] << 8) | data[i + 8], height: (data[i + 5] << 8) | data[i + 6] };
          }
          const len = (data[i + 2] << 8) | data[i + 3];
          i += 2 + len;
        } else { i++; }
      }
    }
    if (data[0] === 0x89 && data[1] === 0x50) {
      return {
        width: (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19],
        height: (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23],
      };
    }
  } catch { /* fall through */ }
  return null;
}

async function getAgent(): Promise<BskyAgent> {
  if (agent) return agent;
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !password) throw new Error('BLUESKY_HANDLE and BLUESKY_APP_PASSWORD must be set');
  agent = new BskyAgent({ service: 'https://bsky.social' });
  await agent.login({ identifier: handle, password });
  console.log('Bluesky: logged in as', handle);
  return agent;
}

async function loadImage(imageUrl: string | null): Promise<{ data: Uint8Array; mimeType: string } | null> {
  if (!imageUrl) return null;
  try {
    const resp = await fetch(imageUrl);
    if (!resp.ok) return null;
    const mimeType = resp.headers.get('content-type') || 'image/jpeg';
    return { data: new Uint8Array(await resp.arrayBuffer()), mimeType };
  } catch { return null; }
}

export async function publish(text: string, imageUrl: string | null): Promise<{ status: string; id?: string; reason?: string }> {
  try {
    const bsky = await getAgent();
    const rt = new RichText({ text });
    await rt.detectFacets(bsky);

    const post: Record<string, unknown> = {
      $type: 'app.bsky.feed.post',
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    };

    const image = await loadImage(imageUrl);
    if (image) {
      if (image.data.length > 1_000_000) {
        console.warn('Bluesky: image exceeds 1MB, posting without image');
      } else {
        const uploadResp = await bsky.uploadBlob(image.data, { encoding: image.mimeType });
        const dims = getImageDimensions(image.data);
        const imageEntry: Record<string, unknown> = { alt: 'Article image', image: uploadResp.data.blob };
        if (dims) {
          imageEntry.aspectRatio = { width: dims.width, height: dims.height };
        }
        post.embed = { $type: 'app.bsky.embed.images', images: [imageEntry] };
      }
    }

    const result = await bsky.post(post);
    console.log('Bluesky: posted successfully');
    return { status: 'published', id: result.uri };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('auth') || message.includes('token')) agent = null;
    console.error('Bluesky: publish error:', message);
    return { status: 'error', reason: message };
  }
}
