'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import Loader from '@/components/Loader';

export default function RootPage() {
    const router = useRouter();
    const createSession = useMutation(api.stage.createSession);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        createSession({})
            .then((id) => {
                if (!cancelled) {
                    router.replace(`/s/${id}`);
                }
            })
            .catch((e: any) => {
                if (!cancelled) {
                    setError(e?.message || 'Failed to create session');
                }
            });

        return () => {
            cancelled = true;
        };
    }, [createSession, router]);

    if (error) {
        return (
            <div style={{ padding: 24, color: '#ef4444', fontFamily: 'ui-monospace, monospace' }}>
                Failed to create session: {error}
            </div>
        );
    }

    return <Loader />;
}
