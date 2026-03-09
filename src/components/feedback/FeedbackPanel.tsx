'use client';

import type { FeedbackAnnotation, StageFeedbackChannelName, StageFeedbackRecordLike } from '@/lib/feedback';

type FeedbackTab = 'new' | 'history';

interface FeedbackPanelProps {
    activeTab: FeedbackTab;
    appName?: string;
    channel: StageFeedbackChannelName | null;
    annotations: FeedbackAnnotation[];
    comment: string;
    authorEmail: string;
    authorName: string;
    history: StageFeedbackRecordLike[];
    isSelecting: boolean;
    isSubmitting: boolean;
    errorMessage: string | null;
    statusMessage: string | null;
    studioSessionSid?: string | null;
    onTabChange: (tab: FeedbackTab) => void;
    onCommentChange: (value: string) => void;
    onAuthorEmailChange: (value: string) => void;
    onAuthorNameChange: (value: string) => void;
    onStartSelecting: () => void;
    onStopSelecting: () => void;
    onRemoveAnnotation: (index: number) => void;
    onClearAnnotations: () => void;
    onSubmit: () => void;
    onCopyDraft: () => void;
    onCopyRecord: (record: StageFeedbackRecordLike) => void;
}

function formatTimestamp(value: number) {
    return new Date(value).toLocaleString();
}

function statusColor(status: StageFeedbackRecordLike['status']) {
    switch (status) {
        case 'resolved':
            return '#16a34a';
        case 'dismissed':
            return '#ef4444';
        case 'in_progress':
            return '#d97706';
        default:
            return '#2563eb';
    }
}

function annotationLabel(annotation: FeedbackAnnotation) {
    const summary = annotation.elementText ? ` ${annotation.elementText}` : '';
    return `${annotation.elementTag}${summary}`.trim();
}

export default function FeedbackPanel(props: FeedbackPanelProps) {
    const {
        activeTab,
        appName,
        channel,
        annotations,
        comment,
        authorEmail,
        authorName,
        history,
        isSelecting,
        isSubmitting,
        errorMessage,
        statusMessage,
        studioSessionSid,
        onTabChange,
        onCommentChange,
        onAuthorEmailChange,
        onAuthorNameChange,
        onStartSelecting,
        onStopSelecting,
        onRemoveAnnotation,
        onClearAnnotations,
        onSubmit,
        onCopyDraft,
        onCopyRecord
    } = props;

    return (
        <div
            style={{
                width: 360,
                maxWidth: 'calc(100vw - 32px)',
                borderRadius: 16,
                border: '1px solid rgba(148, 163, 184, 0.3)',
                background: 'rgba(15, 23, 42, 0.96)',
                color: '#e2e8f0',
                boxShadow: '0 24px 80px rgba(15, 23, 42, 0.45)',
                overflow: 'hidden',
                backdropFilter: 'blur(14px)'
            }}
        >
            <div
                style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.22), rgba(15, 23, 42, 0.10))'
                }}
            >
                <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#93c5fd' }}>
                    Stage feedback
                </div>
                <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>{appName || 'Preview review'}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: '#cbd5e1' }}>
                    Target: {channel ?? 'unassigned version'}
                    {studioSessionSid ? ` - linked to Studio ${studioSessionSid}` : ' - copyable for local agents'}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, padding: 12, borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}>
                {(['new', 'history'] as const).map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => onTabChange(tab)}
                        style={{
                            flex: 1,
                            border: 'none',
                            borderRadius: 999,
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 600,
                            color: activeTab === tab ? '#eff6ff' : '#cbd5e1',
                            background: activeTab === tab ? '#2563eb' : 'rgba(30, 41, 59, 0.9)'
                        }}
                    >
                        {tab === 'new' ? 'New Feedback' : `History (${history.length})`}
                    </button>
                ))}
            </div>

            {activeTab === 'new' ? (
                <div style={{ padding: 16, display: 'grid', gap: 14 }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                        <label style={{ fontSize: 12, color: '#cbd5e1' }}>Your email</label>
                        <input
                            type="email"
                            value={authorEmail}
                            onChange={(event) => onAuthorEmailChange(event.target.value)}
                            placeholder="you@example.com"
                            style={{
                                width: '100%',
                                border: '1px solid rgba(148, 163, 184, 0.28)',
                                borderRadius: 10,
                                background: 'rgba(15, 23, 42, 0.85)',
                                color: '#f8fafc',
                                padding: '10px 12px',
                                fontSize: 13
                            }}
                        />
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                        <label style={{ fontSize: 12, color: '#cbd5e1' }}>Your name (optional)</label>
                        <input
                            type="text"
                            value={authorName}
                            onChange={(event) => onAuthorNameChange(event.target.value)}
                            placeholder="Name"
                            style={{
                                width: '100%',
                                border: '1px solid rgba(148, 163, 184, 0.28)',
                                borderRadius: 10,
                                background: 'rgba(15, 23, 42, 0.85)',
                                color: '#f8fafc',
                                padding: '10px 12px',
                                fontSize: 13
                            }}
                        />
                    </div>

                    <div style={{ display: 'grid', gap: 10 }}>
                        <div
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                        >
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>Annotated elements</div>
                                <div style={{ marginTop: 2, fontSize: 12, color: '#94a3b8' }}>
                                    Pick elements inside the iframe to anchor the feedback.
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={isSelecting ? onStopSelecting : onStartSelecting}
                                style={{
                                    border: 'none',
                                    borderRadius: 999,
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#eff6ff',
                                    background: isSelecting ? '#ef4444' : '#2563eb'
                                }}
                            >
                                {isSelecting ? 'Stop selecting' : 'Select elements'}
                            </button>
                        </div>

                        {annotations.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {annotations.map((annotation, index) => (
                                    <button
                                        key={`${annotation.elementSelector}-${index}`}
                                        type="button"
                                        onClick={() => onRemoveAnnotation(index)}
                                        title={annotation.elementSelector}
                                        style={{
                                            border: '1px solid rgba(59, 130, 246, 0.38)',
                                            borderRadius: 999,
                                            background: 'rgba(37, 99, 235, 0.16)',
                                            color: '#dbeafe',
                                            padding: '7px 10px',
                                            cursor: 'pointer',
                                            fontSize: 12,
                                            maxWidth: '100%'
                                        }}
                                    >
                                        {annotationLabel(annotation)} x
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div
                                style={{
                                    borderRadius: 12,
                                    border: '1px dashed rgba(148, 163, 184, 0.25)',
                                    padding: 12,
                                    fontSize: 12,
                                    color: '#94a3b8'
                                }}
                            >
                                No elements selected yet.
                            </div>
                        )}

                        {annotations.length > 1 ? (
                            <button
                                type="button"
                                onClick={onClearAnnotations}
                                style={{
                                    justifySelf: 'start',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#93c5fd',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    padding: 0
                                }}
                            >
                                Clear all annotations
                            </button>
                        ) : null}
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                        <label style={{ fontSize: 12, color: '#cbd5e1' }}>What should change?</label>
                        <textarea
                            value={comment}
                            onChange={(event) => onCommentChange(event.target.value)}
                            rows={5}
                            placeholder="Describe the issue, expected behavior, and any constraints."
                            style={{
                                width: '100%',
                                resize: 'vertical',
                                border: '1px solid rgba(148, 163, 184, 0.28)',
                                borderRadius: 12,
                                background: 'rgba(15, 23, 42, 0.85)',
                                color: '#f8fafc',
                                padding: '12px 14px',
                                fontSize: 13,
                                lineHeight: 1.5
                            }}
                        />
                    </div>

                    {errorMessage ? (
                        <div
                            style={{
                                borderRadius: 12,
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'rgba(239, 68, 68, 0.12)',
                                color: '#fecaca',
                                padding: '10px 12px',
                                fontSize: 12
                            }}
                        >
                            {errorMessage}
                        </div>
                    ) : null}

                    {statusMessage ? (
                        <div
                            style={{
                                borderRadius: 12,
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                background: 'rgba(37, 99, 235, 0.12)',
                                color: '#bfdbfe',
                                padding: '10px 12px',
                                fontSize: 12
                            }}
                        >
                            {statusMessage}
                        </div>
                    ) : null}

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            type="button"
                            onClick={onCopyDraft}
                            disabled={isSubmitting}
                            style={{
                                flex: 1,
                                borderRadius: 12,
                                border: '1px solid rgba(148, 163, 184, 0.24)',
                                background: 'rgba(30, 41, 59, 0.92)',
                                color: '#e2e8f0',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                padding: '11px 14px',
                                fontSize: 13,
                                fontWeight: 600,
                                opacity: isSubmitting ? 0.6 : 1
                            }}
                        >
                            Copy for agent
                        </button>
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={isSubmitting}
                            style={{
                                flex: 1,
                                border: 'none',
                                borderRadius: 12,
                                background: '#2563eb',
                                color: '#eff6ff',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                padding: '11px 14px',
                                fontSize: 13,
                                fontWeight: 700,
                                opacity: isSubmitting ? 0.6 : 1
                            }}
                        >
                            {isSubmitting ? 'Saving...' : 'Save feedback'}
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ maxHeight: 420, overflowY: 'auto', padding: 16, display: 'grid', gap: 12 }}>
                    {history.length === 0 ? (
                        <div
                            style={{
                                borderRadius: 12,
                                border: '1px dashed rgba(148, 163, 184, 0.25)',
                                padding: 14,
                                fontSize: 12,
                                color: '#94a3b8'
                            }}
                        >
                            No feedback has been saved for this app yet.
                        </div>
                    ) : (
                        history.map((record) => (
                            <div
                                key={record.sid}
                                style={{
                                    borderRadius: 14,
                                    border: '1px solid rgba(148, 163, 184, 0.18)',
                                    background: 'rgba(15, 23, 42, 0.74)',
                                    padding: 14,
                                    display: 'grid',
                                    gap: 10
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'start',
                                        justifyContent: 'space-between',
                                        gap: 12
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                            {record.authorName ? `${record.authorName} - ` : ''}
                                            {record.authorEmail}
                                        </div>
                                        <div style={{ marginTop: 4, fontSize: 12, color: '#cbd5e1' }}>
                                            {formatTimestamp(record.createdAt)}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            borderRadius: 999,
                                            padding: '5px 8px',
                                            background: `${statusColor(record.status)}22`,
                                            color: statusColor(record.status),
                                            fontSize: 11,
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.04em'
                                        }}
                                    >
                                        {record.status}
                                    </div>
                                </div>

                                <div style={{ fontSize: 13, lineHeight: 1.5, color: '#e2e8f0' }}>{record.comment}</div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {record.annotations.length > 0 ? (
                                        record.annotations.map((annotation, index) => (
                                            <span
                                                key={`${record.sid}-${annotation.elementSelector}-${index}`}
                                                style={{
                                                    borderRadius: 999,
                                                    border: '1px solid rgba(59, 130, 246, 0.28)',
                                                    padding: '6px 9px',
                                                    fontSize: 11,
                                                    color: '#bfdbfe'
                                                }}
                                            >
                                                {annotationLabel(annotation)}
                                            </span>
                                        ))
                                    ) : (
                                        <span style={{ fontSize: 12, color: '#94a3b8' }}>No element annotations</span>
                                    )}
                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 12
                                    }}
                                >
                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                        Version {record.appVersionSid}
                                        {record.studioSessionSid ? ` - Studio ${record.studioSessionSid}` : ''}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onCopyRecord(record)}
                                        style={{
                                            border: 'none',
                                            borderRadius: 10,
                                            padding: '8px 10px',
                                            cursor: 'pointer',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: '#e2e8f0',
                                            background: 'rgba(30, 41, 59, 0.9)'
                                        }}
                                    >
                                        Copy for agent
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
