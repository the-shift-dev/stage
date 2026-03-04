import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session-helper';
import { convexQuery } from '@/lib/convexHttp';
import { resolveSessionIdForApiRequest } from '@/app/api/v1/stage/resolve-session-id';

export async function GET(req: NextRequest) {
  const sessionId = requireSession(req);
  if (sessionId instanceof NextResponse) {
    return NextResponse.json({ success: false, error: 'Session required' }, { status: 400 });
  }

  const resolvedSessionId = await resolveSessionIdForApiRequest(sessionId);
  if (!resolvedSessionId) {
    return NextResponse.json({ success: false, error: `Session not found: ${sessionId}` }, { status: 404 });
  }

  try {
    const status = await convexQuery('getStatus', { sessionId: resolvedSessionId });
    return NextResponse.json({ success: true, data: status });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to fetch status' },
      { status: 500 },
    );
  }
}
