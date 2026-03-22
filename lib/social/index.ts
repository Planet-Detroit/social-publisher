// Unified social media publishing
import * as bluesky from './bluesky';
import * as twitter from './twitter';
import * as facebook from './facebook';
import * as instagram from './instagram';
import * as linkedin from './linkedin';

const platforms: Record<string, { publish: (text: string, imageUrl: string | null) => Promise<{ status: string; id?: string; reason?: string }> }> = {
  bluesky,
  twitter,
  facebook,
  instagram,
  linkedin,
};

export interface PublishResult {
  platform: string;
  status: string;
  id?: string;
  reason?: string;
}

export async function publishPosts(
  posts: Record<string, string>,
  selectedPlatforms: string[],
  imageUrl: string | null
): Promise<PublishResult[]> {
  const results: PublishResult[] = [];

  for (const platform of selectedPlatforms) {
    const content = posts[platform];
    if (!content) {
      results.push({ platform, status: 'skipped', reason: 'No content generated' });
      continue;
    }

    const service = platforms[platform];
    if (!service) {
      results.push({ platform, status: 'skipped', reason: 'Platform not supported' });
      continue;
    }

    console.log(`Publishing to ${platform}...`);
    const result = await service.publish(content, imageUrl);
    results.push({ platform, ...result });
  }

  return results;
}
