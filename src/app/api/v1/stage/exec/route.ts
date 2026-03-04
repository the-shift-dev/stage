import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'exec is not supported with Convex backend' },
    { status: 501 },
  );
}
