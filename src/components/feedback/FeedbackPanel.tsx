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
            return 'var(--status-ok, #16a34a)';
        case 'dismissed':
            return 'var(--status-danger, #ef4444)';
        case 'in_progress':
            return 'var(--status-warning, #d97706)';
        default:
            return 'var(--accent, #008CFF)';
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
                border: '1px solid var(--border-key, #EDEDED)',
                background: 'var(--bg-primary, #FBFAF9)',
                color: 'var(--text-primary, #121212)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden'
            }}
        >
            <div
                style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border-key, #EDEDED)',
                    background: 'var(--bg-secondary, #F6F4EF)'
                }}
            >
                <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent, #008CFF)' }}>
                    Stage feedback
                </div>
                <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>{appName || 'Preview review'}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary, #494440)' }}>
                    Target: {channel ?? 'unassigned version'}
                    {studioSessionSid ? ` - linked to Studio ${studioSessionSid}` : ' - copyable for local agents'}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, padding: 12, borderBottom: '1px solid var(--border-key, #EDEDED)' }}>
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
                            color: activeTab === tab ? '#fff' : 'var(--text-secondary, #494440)',
                            background: activeTab === tab ? 'var(--accent, #008CFF)' : 'var(--bg-secondary, #F6F4EF)'
                        }}
                    >
                        {tab === 'new' ? 'New Feedback' : `History (${history.length})`}
                    </button>
                ))}
            </div>

            {activeTab === 'new' ? (
                <div style={{ padding: 16, display: 'grid', gap: 14 }}>
                    <div style={{ display: 'grid', gap: 8 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary, #494440)' }}>Your email</label>
                        <input
                            type="email"
                            value={authorEmail}
                            onChange={(event) => onAuthorEmailChange(event.target.value)}
                            placeholder="you@example.com"
                            style={{
                                width: '100%',
                                border: '1px solid var(--border-key, #EDEDED)',
                                borderRadius: 10,
                                background: 'var(--bg-key, #FFFFFF)',
                                color: 'var(--text-primary, #121212)',
                                padding: '10px 12px',
                                fontSize: 13
                            }}
                        />
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary, #494440)' }}>Your name (optional)</label>
                        <input
                            type="text"
                            value={authorName}
                            onChange={(event) => onAuthorNameChange(event.target.value)}
                            placeholder="Name"
                            style={{
                                width: '100%',
                                border: '1px solid var(--border-key, #EDEDED)',
                                borderRadius: 10,
                                background: 'var(--bg-key, #FFFFFF)',
                                color: 'var(--text-primary, #121212)',
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
                                <div style={{ marginTop: 2, fontSize: 12, color: 'var(--text-muted, #848281)' }}>
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
                                    color: '#fff',
                                    background: isSelecting ? 'var(--status-danger, #ef4444)' : 'var(--accent, #008CFF)'
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
                                            border: '1px solid var(--border-key, rgba(0, 140, 255, 0.25))',
                                            borderRadius: 999,
                                            background: 'var(--bg-key, rgba(0, 140, 255, 0.08))',
                                            color: 'var(--text-secondary, #494440)',
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
                                    border: '1px dashed var(--border-key, #EDEDED)',
                                    padding: 12,
                                    fontSize: 12,
                                    color: 'var(--text-muted, #848281)'
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
                                    color: 'var(--accent, #008CFF)',
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
                        <label style={{ fontSize: 12, color: 'var(--text-secondary, #494440)' }}>What should change?</label>
                        <textarea
                            value={comment}
                            onChange={(event) => onCommentChange(event.target.value)}
                            rows={5}
                            placeholder="Describe the issue, expected behavior, and any constraints."
                            style={{
                                width: '100%',
                                resize: 'vertical',
                                border: '1px solid var(--border-key, #EDEDED)',
                                borderRadius: 12,
                                background: 'var(--bg-key, #FFFFFF)',
                                color: 'var(--text-primary, #121212)',
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
                                border: '1px solid var(--status-danger, rgba(239, 68, 68, 0.3))',
                                background: 'var(--status-danger-bg, rgba(239, 68, 68, 0.08))',
                                color: 'var(--status-danger, #dc2626)',
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
                                border: '1px solid var(--border-key, rgba(0, 140, 255, 0.2))',
                                background: 'var(--bg-key, rgba(0, 140, 255, 0.06))',
                                color: 'var(--text-secondary, #494440)',
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
                                border: '1px solid var(--border-key, #EDEDED)',
                                background: 'var(--bg-secondary, #F6F4EF)',
                                color: 'var(--text-primary, #121212)',
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
                                background: 'var(--accent, #008CFF)',
                                color: '#fff',
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
                                border: '1px dashed var(--border-key, #EDEDED)',
                                padding: 14,
                                fontSize: 12,
                                color: 'var(--text-muted, #848281)'
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
                                    border: '1px solid var(--border-key, #EDEDED)',
                                    background: 'var(--bg-key, #FFFFFF)',
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
                                        <div style={{ fontSize: 12, color: 'var(--text-muted, #848281)' }}>
                                            {record.authorName ? `${record.authorName} - ` : ''}
                                            {record.authorEmail}
                                        </div>
                                        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary, #494440)' }}>
                                            {formatTimestamp(record.createdAt)}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            borderRadius: 999,
                                            padding: '5px 8px',
                                            background: `color-mix(in srgb, ${statusColor(record.status)} 13%, transparent)`,
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

                                <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-primary, #121212)' }}>{record.comment}</div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {record.annotations.length > 0 ? (
                                        record.annotations.map((annotation, index) => (
                                            <span
                                                key={`${record.sid}-${annotation.elementSelector}-${index}`}
                                                style={{
                                                    borderRadius: 999,
                                                    border: '1px solid var(--border-key, rgba(0, 140, 255, 0.2))',
                                                    padding: '6px 9px',
                                                    fontSize: 11,
                                                    color: 'var(--text-secondary, #494440)'
                                                }}
                                            >
                                                {annotationLabel(annotation)}
                                            </span>
                                        ))
                                    ) : (
                                        <span style={{ fontSize: 12, color: 'var(--text-muted, #848281)' }}>No element annotations</span>
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
                                    <div style={{ fontSize: 11, color: 'var(--text-muted, #848281)' }}>
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
                                            color: 'var(--text-primary, #121212)',
                                            background: 'var(--bg-secondary, #F6F4EF)'
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
