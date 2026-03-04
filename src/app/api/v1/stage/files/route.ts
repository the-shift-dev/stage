import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session-helper';
import { convexMutation, convexQuery } from '@/lib/convexHttp';
import { resolveSessionIdForApiRequest } from '@/app/api/v1/stage/resolve-session-id';

export async function POST(req: NextRequest) {
  const sessionId = requireSession(req);
  if (sessionId instanceof NextResponse) {
    return NextResponse.json({ success: false, error: 'Session required' }, { status: 400 });
  }

  const resolvedSessionId = await resolveSessionIdForApiRequest(sessionId);
  if (!resolvedSessionId) {
    return NextResponse.json({ success: false, error: `Session not found: ${sessionId}` }, { status: 404 });
  }

  const { files } = await req.json().catch(() => ({}));
  if (!files || typeof files !== 'object') {
    return NextResponse.json({ success: false, error: 'files object required' }, { status: 400 });
  }

  try {
    const entries = Object.entries(files as Record<string, string>);
    for (const [path, content] of entries) {
      await convexMutation('writeFile', { sessionId: resolvedSessionId, path, content });
    }
    return NextResponse.json({ success: true, data: { count: entries.length } });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to write files' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const sessionId = requireSession(req);
  if (sessionId instanceof NextResponse) {
    return NextResponse.json({ success: false, error: 'Session required' }, { status: 400 });
  }

  const resolvedSessionId = await resolveSessionIdForApiRequest(sessionId);
  if (!resolvedSessionId) {
    return NextResponse.json({ success: false, error: `Session not found: ${sessionId}` }, { status: 404 });
  }

  const path = req.nextUrl.searchParams.get('path');
  if (!path) {
    return NextResponse.json({ success: false, error: 'path query param required' }, { status: 400 });
  }

  try {
    const result = await convexQuery<{ content: string } | null>('readFile', {
      sessionId: resolvedSessionId,
      path,
    });
    if (!result) {
      return NextResponse.json({ success: false, error: `File not found: ${path}` }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { path, content: result.content } });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to read file' },
      { status: 500 },
    );
  }
}
