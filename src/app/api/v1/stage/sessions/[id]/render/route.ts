import { NextRequest, NextResponse } from 'next/server';
import { convexMutation } from '@/lib/convexHttp';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const entry = body.entry || '/app/App.tsx';

  try {
    const result = await convexMutation<{ entry: string; version: number }>('triggerRender', {
      sessionId: id,
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
