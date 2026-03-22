import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET() {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const historyPath = path.join(process.cwd(), 'data', 'history.json');
  if (!fs.existsSync(historyPath)) {
    return NextResponse.json([]);
  }

  try {
    const history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
    return NextResponse.json(history.slice(0, 20));
  } catch {
    return NextResponse.json([]);
  }
}
