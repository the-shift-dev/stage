export interface StageSessionSummary {
    id: string;
    app?: {
        sid?: string;
    } | null;
}

const CONVEX_SESSION_ID_RE = /^q[0-9a-z]{20,}$/i;

export function isLikelyConvexSessionId(sessionId: string): boolean {
    return CONVEX_SESSION_ID_RE.test(sessionId.trim());
}

export function resolveSessionId(sessionId: string, sessions: StageSessionSummary[]): string | null {
    const candidate = sessionId.trim();
    if (!candidate) return null;

    if (isLikelyConvexSessionId(candidate)) return candidate;

    const exactMatch = sessions.find((session) => session.id === candidate);
    if (exactMatch?.id) return exactMatch.id;

    const sidMatch = sessions.find((session) => session.app?.sid === candidate);
    return sidMatch?.id ?? null;
}
