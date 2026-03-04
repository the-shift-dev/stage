import { NextResponse } from 'next/server';
import { convexMutation } from '@/lib/convexHttp';

export async function POST() {
  try {
    const id = await convexMutation<string>('createSession', {});
    return NextResponse.json({ success: true, data: { id } });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to create session' },
      { status: 500 },
    );
  }
}
