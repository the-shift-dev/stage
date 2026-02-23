import { NextResponse } from 'next/server';
import { createSession } from '@/lib/server-runtime';

export async function POST() {
    try {
        const id = await createSession();
        return NextResponse.json({ id });
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}
