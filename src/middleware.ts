import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (!pathname.startsWith('/crm-pipeline')) {
        return NextResponse.next();
    }

    // If Vercel Authentication is enabled at deployment level, this is an extra app-level guard.
    const user = process.env.CRM_VIEW_USER;
    const pass = process.env.CRM_VIEW_PASS;

    if (!user || !pass) {
        return NextResponse.next();
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Basic ')) {
        return new NextResponse('Auth required', {
            status: 401,
            headers: { 'WWW-Authenticate': 'Basic realm="CRM Pipeline"' }
        });
    }

    const base64 = authHeader.split(' ')[1] || '';
    const [u, p] = Buffer.from(base64, 'base64').toString('utf-8').split(':');

    if (u !== user || p !== pass) {
        return new NextResponse('Unauthorized', {
            status: 401,
            headers: { 'WWW-Authenticate': 'Basic realm="CRM Pipeline"' }
        });
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/crm-pipeline/:path*']
};
