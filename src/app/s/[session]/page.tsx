'use client';

import { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import DynamicComponent from '@/components/DynamicComponent';
import AuthGate from '@/components/AuthGate';
import FeedbackBubble from '@/components/feedback/FeedbackBubble';
import Loader from '@/components/Loader';
import TailwindProvider from '@/components/TailwindProvider';
import { resolveFeedbackTarget, type StageFeedbackAppLike } from '@/lib/feedback';
import { createGoogleClient, type GoogleClient, type GoogleUser } from '@/lib/googleClient';
import { fetchFeedbackContext } from '@/lib/feedback-client';
import { resolveSessionId, isLikelyConvexSessionId, type StageSessionSummary } from '@/lib/session-resolver';

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
    const searchParams = useSearchParams();
    const [copied, setCopied] = useState(false);
    const [googleAuthUser, setGoogleAuthUser] = useState<GoogleUser | null>(null);
    const [googleAuthChecked, setGoogleAuthChecked] = useState(false);
    const [resolvedSessionId, setResolvedSessionId] = useState<Id<'sessions'> | null>(null);
    const [sessionResolutionError, setSessionResolutionError] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    useEffect(() => {
        let cancelled = false;

        if (!session) {
            setResolvedSessionId(null);
            setSessionResolutionError('Missing session id');
            return;
        }

        if (isLikelyConvexSessionId(session)) {
            setResolvedSessionId(session as Id<'sessions'>);
            setSessionResolutionError(null);
            return;
        }

        const resolve = async () => {
            try {
                const response = await fetch('/api/v1/stage/sessions');
                const payload = (await response.json()) as {
                    success: boolean;
                    data: StageSessionSummary[];
                    error?: string;
                };

                if (!response.ok || !payload.success) {
                    throw new Error(payload.error || 'Failed to resolve session');
                }

                const resolved = resolveSessionId(session, payload.data);
                if (!resolved) {
                    throw new Error(`Session not found: ${session}`);
                }

                if (!cancelled) {
                    setResolvedSessionId(resolved as Id<'sessions'>);
                    setSessionResolutionError(null);
                }
            } catch (e: any) {
                if (!cancelled) {
                    setSessionResolutionError(e?.message || 'Failed to resolve session');
                    setResolvedSessionId(null);
                }
            }
        };

        void resolve();

        return () => {
            cancelled = true;
        };
    }, [session]);

    // Use skip if no resolved session id yet
    const queryArgs = resolvedSessionId ? { sessionId: resolvedSessionId } : 'skip';

    // Reactive queries with skip support
    const renderState = useQuery(api.stage.getRenderState, queryArgs);
    const allFiles = useQuery(api.stage.getAllFiles, queryArgs);
    const liveData = useQuery(api.stage.getLiveData, queryArgs);
    const messages = useQuery(api.stage.getMessages, queryArgs);
    const googleScopes = useQuery(api.stage.getGoogleScopes, queryArgs);
    const [stageApp, setStageApp] = useState<StageFeedbackAppLike | null>(null);

    // Debug logging
    console.log('[SessionContent] session:', session, 'queryArgs:', queryArgs);
    console.log('[SessionContent] renderState:', renderState);
    console.log('[SessionContent] allFiles:', allFiles);

    // Check end-user Google auth status when scopes are required
    useEffect(() => {
        if (!resolvedSessionId || !googleScopes || googleScopes.length === 0) {
            setGoogleAuthChecked(true);
            return;
        }

        fetch(`/auth/stage/me?session=${encodeURIComponent(resolvedSessionId)}`, { credentials: 'include' })
            .then((res) => res.json())
            .then((data) => {
                if (data.authenticated) {
                    setGoogleAuthUser({ email: data.email, name: data.name, picture: data.picture });
                }
                setGoogleAuthChecked(true);
            })
            .catch(() => {
                setGoogleAuthChecked(true);
            });
    }, [resolvedSessionId, googleScopes]);

    useEffect(() => {
        let cancelled = false;

        if (!resolvedSessionId) {
            setStageApp(null);
            return;
        }

        fetchFeedbackContext(resolvedSessionId)
            .then((app) => {
                if (!cancelled) {
                    setStageApp(app);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setStageApp(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [resolvedSessionId]);

    // Mutations for components to use
    const sendMessage = useMutation(api.stage.sendMessage);
    const setLiveData = useMutation(api.stage.setLiveData);
    const reportError = useMutation(api.stage.reportError);
    const feedbackStageApp = stageApp;
    const feedbackParam = searchParams.get('feedback') === '1';
    const studioSessionSid = searchParams.get('studioSessionSid');
    const feedbackTarget = useMemo(
        () => resolveFeedbackTarget(feedbackStageApp, resolvedSessionId),
        [feedbackStageApp, resolvedSessionId]
    );
    const showFeedback = Boolean(
        feedbackStageApp && feedbackTarget.appVersionSid && (feedbackTarget.channel === 'preview' || feedbackParam)
    );

    // Create convex context for components
    const convexContext = {
        liveData,
        messages,
        sendMessage: (text: string, sender: string) => {
            if (!resolvedSessionId) {
                return Promise.reject(new Error('Session not resolved'));
            }
            return sendMessage({ sessionId: resolvedSessionId, text, sender });
        },
        setLiveData: (data: any) => {
            if (!resolvedSessionId) {
                return Promise.reject(new Error('Session not resolved'));
            }
            return setLiveData({ sessionId: resolvedSessionId, data });
        },
        reportError: (error: string) => {
            if (!resolvedSessionId) {
                return Promise.reject(new Error('Session not resolved'));
            }
            return reportError({ sessionId: resolvedSessionId, error });
        }
    };

    // Convert files array to Record<path, content>
    const filesMap = useMemo(() => {
        if (!allFiles) return {};
        const map: Record<string, string> = {};
        for (const file of allFiles) {
            map[file.path] = file.content;
        }
        return map;
    }, [allFiles]);

    // Create Google client if user is authenticated
    const googleClient = useMemo<GoogleClient | undefined>(() => {
        if (!googleAuthUser || !resolvedSessionId) return undefined;
        return createGoogleClient(googleAuthUser, resolvedSessionId);
    }, [googleAuthUser, resolvedSessionId]);

    if (sessionResolutionError) {
        return (
            <div style={{ padding: 40, color: '#ef4444', fontFamily: 'ui-monospace, monospace' }}>
                {sessionResolutionError}
            </div>
        );
    }

    if (!resolvedSessionId) {
        return <Loader />;
    }

    // Loading state
    if (renderState === undefined || allFiles === undefined) {
        return <Loader />;
    }

    // Wait for google auth check
    if (googleScopes === undefined || !googleAuthChecked) {
        return <Loader />;
    }

    // Auth gate: show "Connect with Google" if scopes required but user not authenticated
    if (googleScopes && googleScopes.length > 0 && !googleAuthUser) {
        return <AuthGate sessionId={resolvedSessionId} scopes={googleScopes} />;
    }

    // No code yet — show instructions
    if (!renderState || Object.keys(filesMap).length === 0) {
        const s = resolvedSessionId;
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
                    background: 'hsl(var(--background))'
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
                                stage — {resolvedSessionId}
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
                            color: 'hsl(var(--muted-foreground))',
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

    // Get entry point code
    const entryPath = renderState.entry || '/app/App.tsx';
    const entryCode = filesMap[entryPath];

    if (!entryCode) {
        return (
            <div style={{ padding: 40, color: '#666', fontFamily: 'monospace' }}>
                <h2>Entry point not found: {entryPath}</h2>
                <p>Files available: {Object.keys(filesMap).join(', ') || 'none'}</p>
            </div>
        );
    }

    // Render the component with all files
    return (
        <div className="min-h-0" style={{ minHeight: 0 }}>
            <DynamicComponent
                code={entryCode}
                files={filesMap}
                entryPath={entryPath}
                sessionId={resolvedSessionId}
                convexContext={convexContext}
                googleClient={googleClient}
                stageApp={stageApp ? { sid: stageApp.sid, authorEmail: stageApp.authorEmail ?? undefined } : null}
                onIframeRef={(iframe) => {
                    iframeRef.current = iframe;
                }}
            />
            {showFeedback && feedbackStageApp && feedbackTarget.appVersionSid ? (
                <FeedbackBubble
                    iframeRef={iframeRef}
                    appSid={feedbackStageApp.sid}
                    appName={feedbackStageApp.name}
                    appVersionSid={feedbackTarget.appVersionSid}
                    sessionId={resolvedSessionId}
                    channel={feedbackTarget.channel}
                    viewerEmail={googleAuthUser?.email}
                    viewerName={googleAuthUser?.name}
                    studioSessionSid={studioSessionSid}
                />
            ) : null}
        </div>
    );
};
