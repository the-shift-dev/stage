'use client';

import { type RefObject, useCallback, useEffect, useMemo, useState } from 'react';
import type { Id } from '../../../convex/_generated/dataModel';
import type { FeedbackAnnotation, StageFeedbackChannelName, StageFeedbackRecordLike } from '@/lib/feedback';
import { fetchFeedbackHistory, saveFeedback } from '@/lib/feedback-client';
import { buildFeedbackAgentPrompt } from '@/lib/feedback';
import FeedbackPanel from './FeedbackPanel';
import { useElementSelector } from './useElementSelector';

const AUTHOR_EMAIL_STORAGE_KEY = 'stage-feedback-author-email';
const AUTHOR_NAME_STORAGE_KEY = 'stage-feedback-author-name';

interface FeedbackBubbleProps {
    iframeRef: RefObject<HTMLIFrameElement | null>;
    appSid: string;
    appName?: string;
    appVersionSid: string;
    sessionId: Id<'sessions'>;
    channel: StageFeedbackChannelName | null;
    viewerEmail?: string | null;
    viewerName?: string | null;
    studioSessionSid?: string | null;
}

function newFeedbackSid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `sfb_${crypto.randomUUID()}`;
    }
    return `sfb_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
}

export default function FeedbackBubble(props: FeedbackBubbleProps) {
    const { iframeRef, appSid, appName, appVersionSid, sessionId, channel, viewerEmail, viewerName, studioSessionSid } =
        props;

    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
    const [comment, setComment] = useState('');
    const [authorEmail, setAuthorEmail] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const { annotations, isSelecting, startSelecting, stopSelecting, removeAnnotation, clearAnnotations } =
        useElementSelector(iframeRef);
    const [pendingFeedback, setPendingFeedback] = useState<StageFeedbackRecordLike[]>([]);
    const [history, setHistory] = useState<StageFeedbackRecordLike[]>([]);

    const refreshFeedback = useCallback(async () => {
        const [pending, all] = await Promise.all([
            fetchFeedbackHistory({
                appVersionSid,
                status: 'pending'
            }),
            fetchFeedbackHistory({ appSid })
        ]);

        setPendingFeedback(pending);
        setHistory(all);
    }, [appSid, appVersionSid]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const storedEmail = window.localStorage.getItem(AUTHOR_EMAIL_STORAGE_KEY);
        const storedName = window.localStorage.getItem(AUTHOR_NAME_STORAGE_KEY);

        setAuthorEmail(viewerEmail || storedEmail || '');
        setAuthorName(viewerName || storedName || '');
    }, [viewerEmail, viewerName]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (authorEmail.trim()) {
            window.localStorage.setItem(AUTHOR_EMAIL_STORAGE_KEY, authorEmail.trim());
        }
    }, [authorEmail]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (authorName.trim()) {
            window.localStorage.setItem(AUTHOR_NAME_STORAGE_KEY, authorName.trim());
        }
    }, [authorName]);

    useEffect(() => {
        if (!statusMessage) return;
        const timeout = window.setTimeout(() => setStatusMessage(null), 2500);
        return () => window.clearTimeout(timeout);
    }, [statusMessage]);

    useEffect(() => {
        let cancelled = false;

        refreshFeedback().catch((error) => {
            if (!cancelled) {
                setErrorMessage(error instanceof Error ? error.message : 'Failed to load feedback.');
            }
        });

        return () => {
            cancelled = true;
        };
    }, [refreshFeedback]);

    const copyContext = useMemo(
        () => ({
            appName,
            appSid,
            appVersionSid,
            sessionId,
            channel,
            stageUrl: typeof window === 'undefined' ? null : window.location.href,
            studioSessionSid
        }),
        [appName, appSid, appVersionSid, sessionId, channel, studioSessionSid]
    );

    async function handleCopyDraft() {
        if (!comment.trim() && annotations.length === 0) {
            setErrorMessage('Add a comment or select at least one element before copying feedback.');
            return;
        }

        try {
            setErrorMessage(null);
            await copyText(
                buildFeedbackAgentPrompt(copyContext, {
                    comment,
                    annotations,
                    authorEmail,
                    authorName
                })
            );
            setStatusMessage('Draft copied for your local agent.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to copy feedback.');
        }
    }

    async function handleCopyRecord(record: StageFeedbackRecordLike) {
        try {
            setErrorMessage(null);
            await copyText(
                buildFeedbackAgentPrompt(
                    {
                        ...copyContext,
                        appVersionSid: record.appVersionSid,
                        sessionId: record.sessionId || sessionId,
                        studioSessionSid: record.studioSessionSid ?? studioSessionSid
                    },
                    {
                        comment: record.comment,
                        annotations: record.annotations,
                        authorEmail: record.authorEmail,
                        authorName: record.authorName ?? undefined
                    }
                )
            );
            setStatusMessage('Saved feedback copied for your local agent.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to copy feedback.');
        }
    }

    async function handleSubmit() {
        if (!authorEmail.trim()) {
            setErrorMessage('Your email is required so saved feedback can be traced back to you.');
            return;
        }

        if (!comment.trim()) {
            setErrorMessage('Add a comment before saving feedback.');
            return;
        }

        try {
            setIsSubmitting(true);
            setErrorMessage(null);

            await saveFeedback({
                sid: newFeedbackSid(),
                appSid,
                appVersionSid,
                sessionId,
                studioSessionSid: studioSessionSid || undefined,
                authorEmail: authorEmail.trim(),
                authorName: authorName.trim() || undefined,
                comment: comment.trim(),
                annotations: annotations as FeedbackAnnotation[]
            });

            await refreshFeedback();
            setComment('');
            clearAnnotations();
            stopSelecting();
            setActiveTab('history');
            setStatusMessage('Feedback saved.');
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Failed to save feedback.');
        } finally {
            setIsSubmitting(false);
        }
    }

    const pendingCount = pendingFeedback.length;

    return (
        <div
            style={{
                position: 'fixed',
                right: 16,
                bottom: 16,
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 12
            }}
        >
            {open ? (
                <FeedbackPanel
                    activeTab={activeTab}
                    appName={appName}
                    channel={channel}
                    annotations={annotations}
                    comment={comment}
                    authorEmail={authorEmail}
                    authorName={authorName}
                    history={history}
                    isSelecting={isSelecting}
                    isSubmitting={isSubmitting}
                    errorMessage={errorMessage}
                    statusMessage={statusMessage}
                    studioSessionSid={studioSessionSid}
                    onTabChange={setActiveTab}
                    onCommentChange={setComment}
                    onAuthorEmailChange={setAuthorEmail}
                    onAuthorNameChange={setAuthorName}
                    onStartSelecting={() => {
                        setOpen(true);
                        startSelecting();
                    }}
                    onStopSelecting={stopSelecting}
                    onRemoveAnnotation={removeAnnotation}
                    onClearAnnotations={clearAnnotations}
                    onSubmit={() => void handleSubmit()}
                    onCopyDraft={() => void handleCopyDraft()}
                    onCopyRecord={(record) => void handleCopyRecord(record)}
                />
            ) : null}

            <button
                type="button"
                onClick={() => {
                    setOpen((current) => !current);
                    setErrorMessage(null);
                }}
                aria-label="Open Stage feedback panel"
                style={{
                    position: 'relative',
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    border: '1px solid rgba(148, 163, 184, 0.28)',
                    background: 'linear-gradient(135deg, #2563eb, #0f172a)',
                    color: '#eff6ff',
                    boxShadow: '0 18px 48px rgba(15, 23, 42, 0.45)',
                    cursor: 'pointer',
                    fontSize: 22,
                    fontWeight: 700
                }}
            >
                +
                {pendingCount > 0 ? (
                    <span
                        style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            minWidth: 20,
                            height: 20,
                            borderRadius: 999,
                            padding: '0 6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#ef4444',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 700
                        }}
                    >
                        {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                ) : null}
            </button>
        </div>
    );
}
