import { NextRequest, NextResponse } from 'next/server';
import { triggerRender, getRenderState, readFile } from '@/lib/server-runtime';
import { requireSession } from '@/lib/session-helper';

// Trigger a render
export async function POST(req: NextRequest) {
    const sessionId = requireSession(req);
    if (sessionId instanceof NextResponse) return sessionId;

    const body = await req.json().catch(() => ({}));
    const entry = body.entry || '/app/App.tsx';

    await triggerRender(sessionId, entry);

    try {
        const code = await readFile(sessionId, entry);
        const state = await getRenderState(sessionId);
        return NextResponse.json({
            success: true,
            entry,
            code,
            version: state.version
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 404 });
    }
}

// Poll for current render state
export async function GET(req: NextRequest) {
    const sessionId = requireSession(req);
    if (sessionId instanceof NextResponse) return sessionId;

    const state = await getRenderState(sessionId);
    try {
        const code = await readFile(sessionId, state.entry);
        return NextResponse.json({ ...state, code });
    } catch {
        return NextResponse.json({ ...state, code: null });
    }
}
