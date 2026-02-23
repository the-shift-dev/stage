'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';

export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        async function createAndRedirect() {
            const res = await fetch('/api/stage/sessions', { method: 'POST' });
            const { id } = await res.json();
            router.replace(`/s/${id}`);
        }
        createAndRedirect();
    }, [router]);

    return <Loader />;
}
