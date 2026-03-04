import { NextRequest, NextResponse } from 'next/server';
import { convexQuery } from '@/lib/convexHttp';
import { resolveSessionIdForApiRequest } from '@/app/api/v1/stage/resolve-session-id';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const path = req.nextUrl.searchParams.get('path');

  const resolvedSessionId = await resolveSessionIdForApiRequest(id);
  if (!resolvedSessionId) {
    return NextResponse.json({ success: false, error: `Session not found: ${id}` }, { status: 404 });
  }

  try {
    if (path) {
      const file = await convexQuery<{ path: string; content: string; version?: number } | null>(
        'readFile',
        {
          sessionId: resolvedSessionId,
          path,
        },
      );

      if (!file) {
        return NextResponse.json(
          { success: false, error: `File not found: ${path}` },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, data: file });
    }

    const files = await convexQuery<Array<{ path: string; content: string; version?: number }>>(
      'getAllFiles',
      {
        sessionId: resolvedSessionId,
      },
    );

    return NextResponse.json({ success: true, data: files });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to fetch files' },
      { status: 500 },
    );
  }
}
