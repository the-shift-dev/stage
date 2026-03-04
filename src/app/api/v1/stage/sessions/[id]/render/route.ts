import { NextRequest, NextResponse } from 'next/server';
import { convexMutation } from '@/lib/convexHttp';
import { resolveSessionIdForApiRequest } from '@/app/api/v1/stage/resolve-session-id';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const entry = body.entry || '/app/App.tsx';

  const resolvedSessionId = await resolveSessionIdForApiRequest(id);
  if (!resolvedSessionId) {
    return NextResponse.json({ success: false, error: `Session not found: ${id}` }, { status: 404 });
  }

  try {
    const result = await convexMutation<{ entry: string; version: number }>('triggerRender', {
      sessionId: resolvedSessionId,
      entry,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to trigger render' },
      { status: 500 },
    );
  }
}
