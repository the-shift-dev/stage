import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session-helper';
import { convexMutation, convexQuery } from '@/lib/convexHttp';

export async function POST(req: NextRequest) {
  const sessionId = requireSession(req);
  if (sessionId instanceof NextResponse) {
    return NextResponse.json({ success: false, error: 'Session required' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const entry = body.entry || '/app/App.tsx';

  try {
    const render = await convexMutation<{ entry: string; version: number }>('triggerRender', {
      sessionId,
      entry,
    });

    const file = await convexQuery<{ content: string } | null>('readFile', {
      sessionId,
      path: entry,
    });

    if (!file) {
      return NextResponse.json({ success: false, error: `File not found: ${entry}` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        entry: render.entry,
        code: file.content,
        version: render.version,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to trigger render' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const sessionId = requireSession(req);
  if (sessionId instanceof NextResponse) {
    return NextResponse.json({ success: false, error: 'Session required' }, { status: 400 });
  }

  try {
    const state = await convexQuery<{
      entry: string;
      version: number;
      error?: string;
      renderedAt?: number;
    } | null>('getRenderState', { sessionId });

    if (!state) {
      return NextResponse.json({ success: false, error: 'No render state yet' }, { status: 404 });
    }

    const file = await convexQuery<{ content: string } | null>('readFile', {
      sessionId,
      path: state.entry,
    });

    return NextResponse.json({
      success: true,
      data: { ...state, code: file?.content ?? null },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to fetch render state' },
      { status: 500 },
    );
  }
}
