import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

const stageFeedbackStatus = v.union(
    v.literal('pending'),
    v.literal('in_progress'),
    v.literal('resolved'),
    v.literal('dismissed')
);

const feedbackAnnotation = v.object({
    elementSelector: v.string(),
    elementTag: v.string(),
    elementText: v.optional(v.string()),
    boundingBox: v.optional(
        v.object({
            x: v.number(),
            y: v.number(),
            width: v.number(),
            height: v.number()
        })
    ),
    note: v.optional(v.string())
});

// ============ Sessions ============

export const createSession = mutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const sessionId = await ctx.db.insert('sessions', {
            createdAt: now,
            lastAccessedAt: now
        });
        return sessionId;
    }
});

export const getSession = query({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, { sessionId }) => {
        return await ctx.db.get(sessionId);
    }
});

// ============ Files (with versioning) ============

export const writeFile = mutation({
    args: {
        sessionId: v.id('sessions'),
        path: v.string(),
        content: v.string()
    },
    handler: async (ctx, { sessionId, path, content }) => {
        // Get latest version for this path
        const existing = await ctx.db
            .query('files')
            .withIndex('by_session_path', (q) => q.eq('sessionId', sessionId).eq('path', path))
            .order('desc')
            .first();

        const newVersion = existing && existing.version ? existing.version + 1 : 1;

        // Insert new version
        await ctx.db.insert('files', {
            sessionId,
            path,
            content,
            version: newVersion,
            createdAt: Date.now()
        });

        // Update session access time
        await ctx.db.patch(sessionId, { lastAccessedAt: Date.now() });

        return { path, version: newVersion, size: content.length };
    }
});

export const readFile = query({
    args: {
        sessionId: v.id('sessions'),
        path: v.string()
    },
    handler: async (ctx, { sessionId, path }) => {
        return await ctx.db
            .query('files')
            .withIndex('by_session_path', (q) => q.eq('sessionId', sessionId).eq('path', path))
            .order('desc')
            .first();
    }
});

export const readFileAtVersion = query({
    args: {
        sessionId: v.id('sessions'),
        path: v.string(),
        version: v.number()
    },
    handler: async (ctx, { sessionId, path, version }) => {
        const files = await ctx.db
            .query('files')
            .withIndex('by_session_path', (q) => q.eq('sessionId', sessionId).eq('path', path))
            .collect();

        return files.find((f) => f.version === version) || null;
    }
});

export const getFileHistory = query({
    args: {
        sessionId: v.id('sessions'),
        path: v.string()
    },
    handler: async (ctx, { sessionId, path }) => {
        return await ctx.db
            .query('files')
            .withIndex('by_session_path', (q) => q.eq('sessionId', sessionId).eq('path', path))
            .order('desc')
            .collect();
    }
});

export const getAllFiles = query({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, { sessionId }) => {
        const allFiles = await ctx.db
            .query('files')
            .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
            .collect();

        // Group by path, keep latest version
        const latestByPath = new Map<string, (typeof allFiles)[0]>();
        for (const file of allFiles) {
            const existing = latestByPath.get(file.path);
            if (!existing || (file.version ?? 0) > (existing.version ?? 0)) {
                latestByPath.set(file.path, file);
            }
        }

        return Array.from(latestByPath.values());
    }
});

// ============ Snapshots ============

export const createSnapshot = mutation({
    args: {
        sessionId: v.id('sessions'),
        name: v.optional(v.string())
    },
    handler: async (ctx, { sessionId, name }) => {
        const allFiles = await ctx.db
            .query('files')
            .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
            .collect();

        // Group by path, keep latest
        const latestByPath = new Map<string, (typeof allFiles)[0]>();
        for (const file of allFiles) {
            const existing = latestByPath.get(file.path);
            if (!existing || (file.version ?? 0) > (existing.version ?? 0)) {
                latestByPath.set(file.path, file);
            }
        }

        const files = Array.from(latestByPath.values()).map((f) => ({
            path: f.path,
            content: f.content,
            version: f.version ?? 1
        }));

        const snapshotId = await ctx.db.insert('snapshots', {
            sessionId,
            name,
            files,
            createdAt: Date.now()
        });

        return snapshotId;
    }
});

export const getSnapshots = query({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, { sessionId }) => {
        return await ctx.db
            .query('snapshots')
            .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
            .order('desc')
            .collect();
    }
});

export const restoreSnapshot = mutation({
    args: { snapshotId: v.id('snapshots') },
    handler: async (ctx, { snapshotId }) => {
        const snapshot = await ctx.db.get(snapshotId);
        if (!snapshot) throw new Error('Snapshot not found');

        for (const file of snapshot.files) {
            const existing = await ctx.db
                .query('files')
                .withIndex('by_session_path', (q) => q.eq('sessionId', snapshot.sessionId).eq('path', file.path))
                .order('desc')
                .first();

            const newVersion = existing && existing.version ? existing.version + 1 : 1;

            await ctx.db.insert('files', {
                sessionId: snapshot.sessionId,
                path: file.path,
                content: file.content,
                version: newVersion,
                createdAt: Date.now()
            });
        }

        return { restored: snapshot.files.length };
    }
});

// ============ Render State ============

export const triggerRender = mutation({
    args: {
        sessionId: v.id('sessions'),
        entry: v.optional(v.string())
    },
    handler: async (ctx, { sessionId, entry }) => {
        const entryPoint = entry || '/app/App.tsx';
        const now = Date.now();

        const existing = await ctx.db
            .query('renderState')
            .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                entry: entryPoint,
                version: existing.version + 1,
                error: undefined, // Clear previous error on new render
                renderedAt: now
            });
            return { entry: entryPoint, version: existing.version + 1 };
        } else {
            await ctx.db.insert('renderState', {
                sessionId,
                entry: entryPoint,
                version: 1.0,
                renderedAt: now
            });
            return { entry: entryPoint, version: 1.0 };
        }
    }
});

export const getRenderState = query({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, { sessionId }) => {
        return await ctx.db
            .query('renderState')
            .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
            .first();
    }
});

export const reportError = mutation({
    args: {
        sessionId: v.id('sessions'),
        error: v.string()
    },
    handler: async (ctx, { sessionId, error }) => {
        const existing = await ctx.db
            .query('renderState')
            .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { error });
        }
    }
});

export const clearError = mutation({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, { sessionId }) => {
        const existing = await ctx.db
            .query('renderState')
            .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { error: undefined });
        }
    }
});

export const getStatus = query({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, { sessionId }) => {
        const session = await ctx.db.get(sessionId);
        const renderState = await ctx.db
            .query('renderState')
            .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
            .first();
        const files = await ctx.db
            .query('files')
            .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
            .collect();

        return {
            session: session
                ? {
                      createdAt: session.createdAt,
                      lastAccessedAt: session.lastAccessedAt
                  }
                : null,
            render: renderState
                ? {
                      entry: renderState.entry,
                      version: renderState.version,
                      error: renderState.error || null,
                      renderedAt: renderState.renderedAt || null
                  }
                : null,
            files: files.map((f) => ({
                path: f.path,
                version: f.version || 1,
                size: f.content.length
            }))
        };
    }
});

// ============ KV Store ============

export const kvSet = mutation({
    args: {
        sessionId: v.id('sessions'),
        key: v.string(),
        value: v.any()
    },
    handler: async (ctx, { sessionId, key, value }) => {
        const existing = await ctx.db
            .query('kv')
            .withIndex('by_session_key', (q) => q.eq('sessionId', sessionId).eq('key', key))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { value });
        } else {
            await ctx.db.insert('kv', { sessionId, key, value });
        }
    }
});

export const kvGet = query({
    args: {
        sessionId: v.id('sessions'),
        key: v.string()
    },
    handler: async (ctx, { sessionId, key }) => {
        const entry = await ctx.db
            .query('kv')
            .withIndex('by_session_key', (q) => q.eq('sessionId', sessionId).eq('key', key))
            .first();
        return entry?.value ?? null;
    }
});

// ============ Live Data ============

export const setLiveData = mutation({
    args: {
        sessionId: v.id('sessions'),
        data: v.any()
    },
    handler: async (ctx, { sessionId, data }) => {
        const existing = await ctx.db
            .query('liveData')
            .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { data, updatedAt: Date.now() });
        } else {
            await ctx.db.insert('liveData', {
                sessionId,
                data,
                updatedAt: Date.now()
            });
        }
    }
});

export const getLiveData = query({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, { sessionId }) => {
        const entry = await ctx.db
            .query('liveData')
            .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
            .first();
        return entry?.data ?? null;
    }
});

// ============ Messages ============

export const sendMessage = mutation({
    args: {
        sessionId: v.id('sessions'),
        text: v.string(),
        sender: v.string()
    },
    handler: async (ctx, { sessionId, text, sender }) => {
        await ctx.db.insert('messages', {
            sessionId,
            text,
            sender,
            createdAt: Date.now()
        });
    }
});

export const getMessages = query({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, { sessionId }) => {
        return await ctx.db
            .query('messages')
            .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
            .order('asc')
            .collect();
    }
});

export const clearMessages = mutation({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, { sessionId }) => {
        const messages = await ctx.db
            .query('messages')
            .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
            .collect();

        for (const msg of messages) {
            await ctx.db.delete(msg._id);
        }
    }
});

// ============ Stage Secrets ============

export const setSecret = mutation({
    args: {
        key: v.string(),
        value: v.string()
    },
    handler: async (ctx, { key, value }) => {
        const existing = await ctx.db
            .query('secrets')
            .withIndex('by_key', (q) => q.eq('key', key))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
        } else {
            await ctx.db.insert('secrets', { key, value, updatedAt: Date.now() });
        }
    }
});

export const getSecret = query({
    args: { key: v.string() },
    handler: async (ctx, { key }) => {
        const entry = await ctx.db
            .query('secrets')
            .withIndex('by_key', (q) => q.eq('key', key))
            .first();
        return entry?.value ?? null;
    }
});

// ============ End-User Google Auth ============

export const setGoogleScopes = mutation({
    args: {
        sessionId: v.id('sessions'),
        scopes: v.array(v.string())
    },
    handler: async (ctx, { sessionId, scopes }) => {
        const existing = await ctx.db
            .query('googleScopes')
            .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { scopes, updatedAt: Date.now() });
        } else {
            await ctx.db.insert('googleScopes', {
                sessionId,
                scopes,
                updatedAt: Date.now()
            });
        }
    }
});

export const getGoogleScopes = query({
    args: { sessionId: v.id('sessions') },
    handler: async (ctx, { sessionId }) => {
        const entry = await ctx.db
            .query('googleScopes')
            .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
            .first();
        return entry?.scopes ?? null;
    }
});

export const setUserAuth = mutation({
    args: {
        sessionId: v.id('sessions'),
        email: v.string(),
        name: v.string(),
        picture: v.string(),
        passportAuthorizationId: v.string(),
        scopes: v.array(v.string())
    },
    handler: async (ctx, { sessionId, email, name, picture, passportAuthorizationId, scopes }) => {
        const existing = await ctx.db
            .query('userAuth')
            .withIndex('by_session_email', (q) => q.eq('sessionId', sessionId).eq('email', email))
            .first();

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                name,
                picture,
                passportAuthorizationId,
                scopes,
                status: 'active',
                updatedAt: now
            });
        } else {
            await ctx.db.insert('userAuth', {
                sessionId,
                email,
                name,
                picture,
                passportAuthorizationId,
                scopes,
                status: 'active',
                createdAt: now,
                updatedAt: now
            });
        }
    }
});

export const getUserAuth = query({
    args: {
        sessionId: v.id('sessions'),
        email: v.string()
    },
    handler: async (ctx, { sessionId, email }) => {
        return await ctx.db
            .query('userAuth')
            .withIndex('by_session_email', (q) => q.eq('sessionId', sessionId).eq('email', email))
            .first();
    }
});

// ============ Remote platform stubs ============

export const getAppBySession = query({
    args: { sessionId: v.id('sessions') },
    handler: async () => {
        return null as any;
    }
});

export const createFeedback = mutation({
    args: {
        sid: v.string(),
        appSid: v.string(),
        appVersionSid: v.string(),
        sessionId: v.optional(v.id('sessions')),
        studioSessionSid: v.optional(v.string()),
        authorEmail: v.string(),
        authorName: v.optional(v.string()),
        comment: v.string(),
        annotations: v.array(feedbackAnnotation),
        screenshot: v.optional(v.string())
    },
    handler: async (_ctx, args) => {
        return args.sid;
    }
});

export const listFeedback = query({
    args: {
        appSid: v.optional(v.string()),
        appVersionSid: v.optional(v.string()),
        status: v.optional(stageFeedbackStatus)
    },
    handler: async () => {
        return [] as any;
    }
});

export const getFeedback = query({
    args: { sid: v.string() },
    handler: async () => {
        return null as any;
    }
});

export const updateFeedbackStatus = mutation({
    args: {
        sid: v.string(),
        status: stageFeedbackStatus,
        studioSessionSid: v.optional(v.string())
    },
    handler: async () => {
        return null;
    }
});
