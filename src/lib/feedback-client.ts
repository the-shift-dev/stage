import type { StageFeedbackAppLike, StageFeedbackRecordLike } from '@/lib/feedback';

type ApiResponse<T> = {
    success: boolean;
    data?: T;
    error?: {
        code?: string;
        message?: string;
    };
};

async function parseApiResponse<T>(response: Response): Promise<T> {
    const payload = (await response.json()) as ApiResponse<T>;
    if (!response.ok || !payload.success || payload.data === undefined) {
        throw new Error(payload.error?.message || `Request failed with status ${response.status}`);
    }
    return payload.data;
}

export async function fetchFeedbackContext(sessionId: string): Promise<StageFeedbackAppLike> {
    const response = await fetch(`/api/public/stage/feedback/context?sessionId=${encodeURIComponent(sessionId)}`, {
        credentials: 'same-origin'
    });

    return parseApiResponse<StageFeedbackAppLike>(response);
}

export async function fetchFeedbackHistory(args: {
    appSid?: string;
    appVersionSid?: string;
    status?: string;
}): Promise<StageFeedbackRecordLike[]> {
    const searchParams = new URLSearchParams();
    if (args.appSid) searchParams.set('appSid', args.appSid);
    if (args.appVersionSid) searchParams.set('appVersionSid', args.appVersionSid);
    if (args.status) searchParams.set('status', args.status);

    const response = await fetch(`/api/public/stage/feedback?${searchParams.toString()}`, {
        credentials: 'same-origin'
    });

    return parseApiResponse<StageFeedbackRecordLike[]>(response);
}

export async function saveFeedback(args: {
    sid: string;
    appSid: string;
    appVersionSid: string;
    sessionId: string;
    studioSessionSid?: string;
    authorEmail: string;
    authorName?: string;
    comment: string;
    annotations: StageFeedbackRecordLike['annotations'];
    screenshot?: string;
}): Promise<{ sid: string }> {
    const response = await fetch('/api/public/stage/feedback', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(args)
    });

    return parseApiResponse<{ sid: string }>(response);
}
