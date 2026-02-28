'use client';

import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ReactNode, useEffect, useState } from 'react';

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
console.log('[ConvexClientProvider] URL:', url);

const convex = url ? new ConvexReactClient(url) : null;

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
        console.log('[ConvexClientProvider] Mounted, URL:', url);
    }, []);

    if (!url || !convex) {
        return (
            <div style={{ padding: 40, color: 'red' }}>
                Missing NEXT_PUBLIC_CONVEX_URL env var
            </div>
        );
    }

    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
