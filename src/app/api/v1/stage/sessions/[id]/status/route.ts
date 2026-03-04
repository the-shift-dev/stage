import { NextRequest, NextResponse } from 'next/server';
import { convexQuery } from '@/lib/convexHttp';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  try {
    const status = await convexQuery('getStatus', { sessionId: id });
    if (!status || !(status as any).session) {
      return NextResponse.json(
        { success: false, error: `Session not found: ${id}` },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: status });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Failed to fetch status' },
      { status: 500 },
    );
  }
}
