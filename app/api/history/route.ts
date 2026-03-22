import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

// History requires persistent storage (Vercel KV or database)
// For now, return empty — history will be added when storage is set up
export async function GET() {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json([]);
}
