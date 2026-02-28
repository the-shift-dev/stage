'use client';

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ReactNode, useMemo } from 'react';

// Get URL at module level (build time)
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
    // Create client once and memoize
    const client = useMemo(() => {
        if (!CONVEX_URL) return null;
        console.log('[ConvexClientProvider] Creating client for:', CONVEX_URL);
        return new ConvexReactClient(CONVEX_URL);
    }, []);

    if (!CONVEX_URL || !client) {
        return (
            <div style={{ padding: 40, color: 'red', fontFamily: 'monospace' }}>
                <h2>Missing NEXT_PUBLIC_CONVEX_URL</h2>
                <p>Set it in .env.local to your Convex deployment URL</p>
            </div>
        );
    }

    return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
