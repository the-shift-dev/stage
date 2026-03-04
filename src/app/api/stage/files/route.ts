import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session-helper';
import { convexMutation, convexQuery } from '@/lib/convexHttp';

export async function POST(req: NextRequest) {
  const sessionId = requireSession(req);
  if (sessionId instanceof NextResponse) return sessionId;

  const { files } = await req.json().catch(() => ({}));
  if (!files || typeof files !== 'object') {
    return NextResponse.json({ error: 'files object required' }, { status: 400 });
  }

  try {
    const entries = Object.entries(files as Record<string, string>);
    for (const [path, content] of entries) {
      await convexMutation('writeFile', { sessionId, path, content });
    }

    return NextResponse.json({ success: true, count: entries.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to write files' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const sessionId = requireSession(req);
  if (sessionId instanceof NextResponse) return sessionId;

  const path = req.nextUrl.searchParams.get('path');
  if (!path) {
    return NextResponse.json({ error: 'path query param required' }, { status: 400 });
  }

  try {
    const result = await convexQuery<{ content: string } | null>('readFile', { sessionId, path });
    if (!result) {
      return NextResponse.json({ error: `File not found: ${path}` }, { status: 404 });
    }

    return NextResponse.json({ path, content: result.content });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to read file' }, { status: 404 });
  }
}
