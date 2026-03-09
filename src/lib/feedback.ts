export type StageFeedbackChannelName = 'preview' | 'production';

export type StageFeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'dismissed';

export interface FeedbackAnnotationBoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FeedbackAnnotation {
    elementSelector: string;
    elementTag: string;
    elementText?: string;
    boundingBox?: FeedbackAnnotationBoundingBox;
    note?: string;
}

export interface StageFeedbackRecordLike {
    sid: string;
    appSid: string;
    appVersionSid: string;
    sessionId?: string | null;
    studioSessionSid?: string | null;
    authorEmail: string;
    authorName?: string | null;
    status: StageFeedbackStatus;
    comment: string;
    annotations: FeedbackAnnotation[];
    screenshot?: string | null;
    sentToStudioAt?: number | null;
    resolvedAt?: number | null;
    createdAt: number;
    updatedAt: number;
}

export interface StageFeedbackChannelLike {
    sessionId?: string | null;
    appVersionSid?: string | null;
}

export interface StageFeedbackAppLike {
    sid: string;
    name?: string;
    authorEmail?: string;
    previewSessionId?: string;
    productionSessionId?: string | null;
    previewVersionSid?: string | null;
    productionVersionSid?: string | null;
    resolvedVersionSid?: string | null;
    channels?: {
        preview?: StageFeedbackChannelLike | null;
        production?: StageFeedbackChannelLike | null;
    } | null;
}

export interface FeedbackTarget {
    channel: StageFeedbackChannelName | null;
    appVersionSid: string | null;
}

export interface FeedbackCopyContext {
    appName?: string;
    appSid: string;
    appVersionSid: string;
    sessionId: string;
    channel: StageFeedbackChannelName | null;
    stageUrl?: string | null;
    studioSessionSid?: string | null;
}

export interface FeedbackCopyPayload {
    comment: string;
    annotations: FeedbackAnnotation[];
    authorEmail?: string | null;
    authorName?: string | null;
}

function bullet(value: string) {
    return `- ${value}`;
}

function formatBoundingBox(box?: FeedbackAnnotationBoundingBox) {
    if (!box) return null;
    return `x=${Math.round(box.x)}, y=${Math.round(box.y)}, w=${Math.round(box.width)}, h=${Math.round(box.height)}`;
}

export function resolveStageSessionChannel(
    app: StageFeedbackAppLike | null | undefined,
    sessionId: string | null | undefined
): StageFeedbackChannelName | null {
    if (!app || !sessionId) return null;

    if (app.channels?.preview?.sessionId === sessionId || app.previewSessionId === sessionId) {
        return 'preview';
    }

    if (app.channels?.production?.sessionId === sessionId || app.productionSessionId === sessionId) {
        return 'production';
    }

    return null;
}

export function resolveFeedbackTarget(
    app: StageFeedbackAppLike | null | undefined,
    sessionId: string | null | undefined
): FeedbackTarget {
    const channel = resolveStageSessionChannel(app, sessionId);

    if (!app) {
        return { channel: null, appVersionSid: null };
    }

    if (channel === 'preview') {
        return {
            channel,
            appVersionSid:
                app.channels?.preview?.appVersionSid ?? app.previewVersionSid ?? app.resolvedVersionSid ?? null
        };
    }

    if (channel === 'production') {
        return {
            channel,
            appVersionSid:
                app.channels?.production?.appVersionSid ?? app.productionVersionSid ?? app.resolvedVersionSid ?? null
        };
    }

    return {
        channel: null,
        appVersionSid: app.resolvedVersionSid ?? app.previewVersionSid ?? null
    };
}

export function buildFeedbackAgentPrompt(context: FeedbackCopyContext, payload: FeedbackCopyPayload) {
    const lines = [
        `Stage feedback for ${context.appName || context.appSid}`,
        bullet(`app sid: ${context.appSid}`),
        bullet(`session id: ${context.sessionId}`),
        bullet(`app version sid: ${context.appVersionSid}`),
        bullet(`channel: ${context.channel ?? 'unassigned'}`)
    ];

    if (context.stageUrl) {
        lines.push(bullet(`preview url: ${context.stageUrl}`));
    }

    if (context.studioSessionSid) {
        lines.push(bullet(`studio session sid: ${context.studioSessionSid}`));
    }

    if (payload.authorEmail) {
        lines.push(
            bullet(
                `feedback author: ${payload.authorName ? `${payload.authorName} <${payload.authorEmail}>` : payload.authorEmail}`
            )
        );
    }

    lines.push('', 'Requested change:', payload.comment.trim() || '(no comment provided)', '', 'Annotated elements:');

    if (payload.annotations.length === 0) {
        lines.push('1. No specific DOM elements were attached.');
    } else {
        payload.annotations.forEach((annotation, index) => {
            lines.push(`${index + 1}. selector: ${annotation.elementSelector}`);
            lines.push(`   tag: ${annotation.elementTag}`);
            if (annotation.elementText) {
                lines.push(`   text: ${annotation.elementText}`);
            }
            const box = formatBoundingBox(annotation.boundingBox);
            if (box) {
                lines.push(`   bounds: ${box}`);
            }
            if (annotation.note) {
                lines.push(`   note: ${annotation.note}`);
            }
        });
    }

    lines.push('', 'Please update the Stage app to address this feedback.');

    return lines.join('\n');
}
