import { NextRequest, NextResponse } from 'next/server';
import { writeFiles, readFile } from '@/lib/server-runtime';
import { requireSession } from '@/lib/session-helper';

// Write files
export async function POST(req: NextRequest) {
    const sessionId = requireSession(req);
    if (sessionId instanceof NextResponse) return sessionId;

    const { files } = await req.json();
    if (!files || typeof files !== 'object') {
        return NextResponse.json({ error: 'files object required' }, { status: 400 });
    }
    try {
        await writeFiles(sessionId, files);
        return NextResponse.json({
            success: true,
            count: Object.keys(files).length
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// Read a file
export async function GET(req: NextRequest) {
    const sessionId = requireSession(req);
    if (sessionId instanceof NextResponse) return sessionId;

    const path = req.nextUrl.searchParams.get('path');
    if (!path) {
        return NextResponse.json({ error: 'path query param required' }, { status: 400 });
    }
    try {
        const content = await readFile(sessionId, path);
        return NextResponse.json({ path, content });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 404 });
    }
}
