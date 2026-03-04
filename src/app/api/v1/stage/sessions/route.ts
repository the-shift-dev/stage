import { NextResponse } from 'next/server';
import { convexMutation, convexQuery } from '@/lib/convexHttp';

export async function GET() {
  try {
    const sessions = await convexQuery('listSessions', {});
    return NextResponse.json({ success: true, data: sessions });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to list sessions' },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const id = await convexMutation<string>('createSession', {});
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to create session' },
      { status: 500 },
    );
  }
}
