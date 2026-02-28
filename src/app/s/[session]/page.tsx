'use client';

import { Suspense, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import DynamicComponent from '@/components/DynamicComponent';
import Loader from '@/components/Loader';
import TailwindProvider from '@/components/TailwindProvider';

export default function SessionPage() {
    return (
        <Suspense fallback={<Loader />}>
            <TailwindProvider>
                <SessionContent />
            </TailwindProvider>
        </Suspense>
    );
}

const SessionContent = () => {
    const { session } = useParams<{ session: string }>();
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const sessionId = session as Id<'sessions'>;

    // Reactive queries — update instantly when mutations fire
    const renderState = useQuery(api.stage.getRenderState, { sessionId });
    const liveData = useQuery(api.stage.getLiveData, { sessionId });
    const messages = useQuery(api.stage.getMessages, { sessionId });
    
    // Mutations for components to use
    const sendMessage = useMutation(api.stage.sendMessage);
    const setLiveData = useMutation(api.stage.setLiveData);
    
    // Create a convex context object to pass to components
    const convexContext = {
        liveData,
        messages,
        sendMessage: (text: string, sender: string) => sendMessage({ sessionId, text, sender }),
        setLiveData: (data: any) => setLiveData({ sessionId, data }),
    };

    // Error state
    if (error) {
        return (
            <div style={{ padding: 40, color: 'red', fontFamily: 'monospace' }}>
                <h2>Error connecting to Convex</h2>
                <pre>{error}</pre>
                <p>URL: {process.env.NEXT_PUBLIC_CONVEX_URL}</p>
            </div>
        );
    }

    // Loading state
    if (renderState === undefined) {
        return <Loader />;
    }

    // No code yet — show instructions
    if (!renderState?.code) {
        const s = session;
        const prompt = `You have access to Stage — a sandboxed React runtime that renders components live in the browser.

Session: ${s}
URL: ${typeof window !== 'undefined' ? window.location.href : ''}

Use the stage CLI to write files and render:

  stage write /app/App.tsx ./App.tsx --session ${s}
  stage render --session ${s}

Or push an entire directory:

  stage push ./my-app /app --session ${s}

Available libraries: React, shadcn/ui (Card, Button, Badge, Tabs, etc.), recharts, lodash, papaparse.
Entry point must default-export a React component.
Always pass --session ${s} on every command.`;

        const lines = [
            { type: 'comment', text: '# 🎭 Stage — sandboxed React runtime for AI agents' },
            { type: 'comment', text: `# session: ${s}` },
            { type: 'blank', text: '' },
            { type: 'comment', text: '# write a component' },
            { type: 'prompt', text: `stage write /app/App.tsx ./App.tsx --session ${s}` },
            { type: 'blank', text: '' },
            { type: 'comment', text: '# render it' },
            { type: 'prompt', text: `stage render --session ${s}` },
            { type: 'blank', text: '' },
            { type: 'comment', text: '# or push an entire directory' },
            { type: 'prompt', text: `stage push ./my-app /app --session ${s}` },
            { type: 'blank', text: '' },
            { type: 'comment', text: '# available: react, shadcn/ui, recharts, lodash, papaparse' },
            { type: 'comment', text: '# entry point must default-export a React component' },
            { type: 'comment', text: `# always pass --session ${s} on every command` }
        ];

        const copyPrompt = () => {
            navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };

        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    background: '#f8f8f8'
                }}
            >
                <div style={{ maxWidth: 620, width: '100%', padding: 24 }}>
                    <div
                        style={{
                            background: '#1a1a1a',
                            borderRadius: 10,
                            border: '1px solid #2a2a2a',
                            overflow: 'hidden',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.12)'
                        }}
                    >
                        {/* Title bar */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 16px',
                                background: '#141414',
                                borderBottom: '1px solid #2a2a2a'
                            }}
                        >
                            <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
                            </div>
                            <div style={{ fontSize: 12, color: '#555', fontFamily: 'system-ui' }}>
                                stage — {session}
                            </div>
                            <button
                                onClick={copyPrompt}
                                style={{
                                    background: copied ? '#22c55e22' : '#ffffff08',
                                    color: copied ? '#22c55e' : '#666',
                                    border: `1px solid ${copied ? '#22c55e44' : '#333'}`,
                                    borderRadius: 5,
                                    padding: '3px 10px',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                    fontFamily: 'system-ui',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {copied ? '✓ Copied' : 'Copy prompt'}
                            </button>
                        </div>

                        {/* Terminal body */}
                        <div
                            style={{
                                padding: '16px 20px',
                                fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
                                fontSize: 13,
                                lineHeight: 1.7
                            }}
                        >
                            {lines.map((line, i) => {
                                if (line.type === 'blank') return <div key={i} style={{ height: 8 }} />;
                                if (line.type === 'comment')
                                    return (
                                        <div key={i} style={{ color: '#555' }}>
                                            {line.text}
                                        </div>
                                    );
                                return (
                                    <div key={i} style={{ color: '#e4e4e7' }}>
                                        <span style={{ color: '#22c55e' }}>$ </span>
                                        {line.text}
                                    </div>
                                );
                            })}
                            <div style={{ marginTop: 12 }}>
                                <span style={{ color: '#22c55e' }}>$ </span>
                                <span
                                    style={{
                                        display: 'inline-block',
                                        width: 8,
                                        height: 16,
                                        background: '#22c55e',
                                        verticalAlign: 'text-bottom',
                                        animation: 'blink 1s step-end infinite'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            fontSize: 12,
                            color: '#a1a1aa',
                            marginTop: 14,
                            textAlign: 'center',
                            fontFamily: 'system-ui'
                        }}
                    >
                        This page updates live when content is pushed.
                    </div>
                </div>

                <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
            </div>
        );
    }

    // Render the component
    return (
        <div className="min-h-0" style={{ minHeight: 0 }}>
            <DynamicComponent 
                code={renderState.code} 
                sessionId={session} 
                convexContext={convexContext}
            />
        </div>
    );
};
