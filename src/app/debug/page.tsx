'use client';

import { useState, useEffect } from 'react';

export default function DebugPage() {
    const [result, setResult] = useState<string>('');
    const [url, setUrl] = useState<string>('');

    useEffect(() => {
        setUrl(process.env.NEXT_PUBLIC_CONVEX_URL || 'NOT SET');
    }, []);

    const handleTest = async () => {
        const target = `${url}/api/mutation`;
        setResult(`Fetching: ${target}\n`);
        
        try {
            const res = await fetch(target, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    path: 'stage:createSession',
                    args: {}
                })
            });
            
            const text = await res.text();
            setResult(prev => prev + `Status: ${res.status}\nBody: ${text}`);
        } catch (e: any) {
            setResult(prev => prev + `Error: ${e.name}\nMessage: ${e.message}\nStack: ${e.stack}`);
        }
    };

    const handleTestVersion = async () => {
        const target = `${url}/version`;
        setResult(`Fetching: ${target}\n`);
        
        try {
            const res = await fetch(target);
            const text = await res.text();
            setResult(prev => prev + `Status: ${res.status}\nBody: ${text}`);
        } catch (e: any) {
            setResult(prev => prev + `Error: ${e.name}\nMessage: ${e.message}`);
        }
    };

    return (
        <div style={{ padding: 40, fontFamily: 'monospace' }}>
            <h1>Debug</h1>
            <p>NEXT_PUBLIC_CONVEX_URL: <strong>{url}</strong></p>
            
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={handleTestVersion} style={{ padding: '10px 20px' }}>
                    Test /version (GET)
                </button>
                <button onClick={handleTest} style={{ padding: '10px 20px' }}>
                    Test /api/mutation (POST)
                </button>
            </div>

            <pre style={{ marginTop: 20, whiteSpace: 'pre-wrap', background: '#f0f0f0', padding: 20 }}>
                {result || 'Click a button to test'}
            </pre>
        </div>
    );
}
