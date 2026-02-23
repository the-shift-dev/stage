import { NextRequest, NextResponse } from 'next/server';
import { exec } from '@/lib/server-runtime';
import { requireSession } from '@/lib/session-helper';

export async function POST(req: NextRequest) {
    const sessionId = requireSession(req);
    if (sessionId instanceof NextResponse) return sessionId;

    const { command } = await req.json();
    if (!command) {
        return NextResponse.json({ error: 'command required' }, { status: 400 });
    }
    try {
        const result = await exec(sessionId, command);
        return NextResponse.json({
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
