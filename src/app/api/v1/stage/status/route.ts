import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session-helper';
import { convexQuery } from '@/lib/convexHttp';

export async function GET(req: NextRequest) {
  const sessionId = requireSession(req);
  if (sessionId instanceof NextResponse) {
    return NextResponse.json({ success: false, error: 'Session required' }, { status: 400 });
  }

  try {
    const status = await convexQuery('getStatus', { sessionId });
    return NextResponse.json({ success: true, data: status });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to fetch status' },
      { status: 500 },
    );
  }
}
