import { NextRequest, NextResponse } from 'next/server';
import { convexMutation, convexQuery } from '@/lib/convexHttp';
import { resolveSessionIdForApiRequest } from '@/app/api/v1/stage/resolve-session-id';

function toStagePath(parts: string[] | undefined): string {
  const safe = (parts || []).filter(Boolean);
  return `/${safe.join('/')}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; path: string[] } },
) {
  const { id, path } = params;
  const filePath = toStagePath(path);

  const resolvedSessionId = await resolveSessionIdForApiRequest(id);
  if (!resolvedSessionId) {
    return NextResponse.json({ success: false, error: `Session not found: ${id}` }, { status: 404 });
  }

  if (filePath === '/') {
    return NextResponse.json({ success: false, error: 'File path is required' }, { status: 400 });
  }

  try {
    const file = await convexQuery<{ path: string; content: string; version?: number } | null>('readFile', {
      sessionId: resolvedSessionId,
      path: filePath,
    });

    if (!file) {
      return NextResponse.json(
        { success: false, error: `File not found: ${filePath}` },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: file });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to read file' },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; path: string[] } },
) {
  const { id, path } = params;
  const filePath = toStagePath(path);

  const resolvedSessionId = await resolveSessionIdForApiRequest(id);
  if (!resolvedSessionId) {
    return NextResponse.json({ success: false, error: `Session not found: ${id}` }, { status: 404 });
  }

  if (filePath === '/') {
    return NextResponse.json({ success: false, error: 'File path is required' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body.content !== 'string') {
    return NextResponse.json(
      { success: false, error: 'content (string) is required' },
      { status: 400 },
    );
  }

  try {
    const result = await convexMutation<{ path: string; version: number; size: number }>('writeFile', {
      sessionId: resolvedSessionId,
      path: filePath,
      content: body.content,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to write file' },
      { status: 500 },
    );
  }
}
