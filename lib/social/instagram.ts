// Direct Instagram posting via Graph API (Content Publishing)
// Supports single image posts and multi-image carousel posts (2-10 images)
const GRAPH_API = 'https://graph.facebook.com/v21.0';

export async function publish(text: string, imageUrl: string | null, imageUrls?: string[]): Promise<{ status: string; id?: string; reason?: string }> {
  const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!igAccountId || !accessToken) return { status: 'error', reason: 'INSTAGRAM_ACCOUNT_ID and access token must be set' };

  // Build the list of images to post
  const allImages = imageUrls && imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []);
  if (allImages.length === 0) return { status: 'skipped', reason: 'Instagram requires at least one image' };

  try {
    if (allImages.length === 1) {
      // Single image post (existing flow)
      return await publishSingle(igAccountId, accessToken, text, allImages[0]);
    } else {
      // Carousel post (2-10 images)
      return await publishCarousel(igAccountId, accessToken, text, allImages);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'error', reason: message };
  }
}

async function publishSingle(
  igAccountId: string, accessToken: string, text: string, imageUrl: string
): Promise<{ status: string; id?: string; reason?: string }> {
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

  console.log('Instagram: single image posted successfully');
  return { status: 'published', id: publishData.id };
}

async function publishCarousel(
  igAccountId: string, accessToken: string, text: string, imageUrls: string[]
): Promise<{ status: string; id?: string; reason?: string }> {
  // Step 1: Create a child container for each image (no caption on children)
  const childIds: string[] = [];
  for (const url of imageUrls) {
    const res = await fetch(`${GRAPH_API}/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: url,
        is_carousel_item: true,
        access_token: accessToken,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { status: 'error', reason: `Carousel child failed: ${data.error?.message || JSON.stringify(data.error)}` };
    }
    childIds.push(data.id);
  }

  // Brief pause for Instagram to process all images
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 2: Create the carousel container referencing all children
  const carouselRes = await fetch(`${GRAPH_API}/${igAccountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption: text,
      access_token: accessToken,
    }),
  });
  const carouselData = await carouselRes.json();
  if (!carouselRes.ok) {
    return { status: 'error', reason: `Carousel container failed: ${carouselData.error?.message || JSON.stringify(carouselData.error)}` };
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 3: Publish the carousel
  const publishRes = await fetch(`${GRAPH_API}/${igAccountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: carouselData.id, access_token: accessToken }),
  });
  const publishData = await publishRes.json();
  if (!publishRes.ok) {
    return { status: 'error', reason: `Carousel publish failed: ${publishData.error?.message || JSON.stringify(publishData.error)}` };
  }

  console.log(`Instagram: carousel posted successfully (${imageUrls.length} images)`);
  return { status: 'published', id: publishData.id };
}
