import { convexQuery } from '@/lib/convexHttp';
import {
    isLikelyConvexSessionId,
    resolveSessionId,
    type StageSessionSummary,
} from '@/lib/session-resolver';

export async function resolveSessionIdForApiRequest(sessionId: string): Promise<string | null> {
    const rawSessionId = sessionId.trim();
    if (!rawSessionId) return null;
    if (isLikelyConvexSessionId(rawSessionId)) {
        return rawSessionId;
    }

    const sessions = await convexQuery<StageSessionSummary[]>('listSessions', {});
    return resolveSessionId(rawSessionId, sessions);
}
