import { NextRequest, NextResponse } from 'next/server';

/**
 * Extract session ID from request.
 * Checks: X-Stage-Session header → ?session= query param.
 * Returns null if not found.
 */
export function getSessionId(req: NextRequest): string | null {
    return req.headers.get('x-stage-session') || req.nextUrl.searchParams.get('session') || null;
}

export function requireSession(req: NextRequest): string | NextResponse {
    const id = getSessionId(req);
    if (!id) {
        return NextResponse.json(
            { error: 'Session required. Set X-Stage-Session header or ?session= query param.' },
            { status: 400 }
        );
    }
    return id;
}
