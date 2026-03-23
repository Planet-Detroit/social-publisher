import { neon } from '@neondatabase/serverless';

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return neon(url);
}

// Run on first request to ensure tables exist
let initialized = false;

export async function ensureTables() {
  if (initialized) return;
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS drafts (
      id SERIAL PRIMARY KEY,
      article_url TEXT,
      article_title TEXT,
      article_body TEXT,
      image_url TEXT,
      posts JSONB NOT NULL,
      mode TEXT DEFAULT 'article',
      freeform_text TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS publish_history (
      id SERIAL PRIMARY KEY,
      article_url TEXT,
      article_title TEXT,
      image_url TEXT,
      platforms JSONB NOT NULL,
      published_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id SERIAL PRIMARY KEY,
      article_url TEXT,
      article_title TEXT,
      image_url TEXT,
      platform_images JSONB DEFAULT '{}',
      posts JSONB NOT NULL,
      platforms JSONB NOT NULL,
      scheduled_at TIMESTAMPTZ NOT NULL,
      platform_times JSONB DEFAULT '{}',
      status TEXT DEFAULT 'scheduled',
      publish_results JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  initialized = true;
}
