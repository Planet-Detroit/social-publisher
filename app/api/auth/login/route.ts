import { NextRequest, NextResponse } from 'next/server';
import { setAuthenticated } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password === process.env.ADMIN_PASSWORD) {
    await setAuthenticated();
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
}
