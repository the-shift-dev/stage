import { NextRequest, NextResponse } from 'next/server';
import { convexQuery } from '@/lib/convexHttp';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  const path = req.nextUrl.searchParams.get('path');

  try {
    if (path) {
      const file = await convexQuery<{ path: string; content: string; version?: number } | null>(
        'readFile',
        {
          sessionId: id,
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
        sessionId: id,
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
