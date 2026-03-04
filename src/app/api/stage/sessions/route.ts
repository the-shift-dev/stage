import { NextResponse } from 'next/server';
import { convexMutation } from '@/lib/convexHttp';

export async function POST() {
  try {
    const id = await convexMutation<string>('createSession', {});
    return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create session' }, { status: 500 });
  }
}
