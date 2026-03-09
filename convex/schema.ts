import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    sessions: defineTable({
        createdAt: v.number(),
        lastAccessedAt: v.number()
    }),

    // Files with versioning (inline content for now, can migrate to storage later)
    files: defineTable({
        sessionId: v.id('sessions'),
        path: v.string(),
        content: v.string(),
        version: v.optional(v.number()), // optional for old data
        createdAt: v.optional(v.number()), // optional for old data
        updatedAt: v.optional(v.number()) // legacy field
    })
        .index('by_session', ['sessionId'])
        .index('by_session_path', ['sessionId', 'path']),

    // Snapshots (like git commits)
    snapshots: defineTable({
        sessionId: v.id('sessions'),
        name: v.optional(v.string()),
        files: v.array(
            v.object({
                path: v.string(),
                content: v.string(),
                version: v.number()
            })
        ),
        createdAt: v.number()
    }).index('by_session', ['sessionId']),

    // Render state
    renderState: defineTable({
        sessionId: v.id('sessions'),
        entry: v.string(),
        version: v.number(),
        error: v.optional(v.string()),
        renderedAt: v.optional(v.number())
    }).index('by_session', ['sessionId']),

    // KV store
    kv: defineTable({
        sessionId: v.id('sessions'),
        key: v.string(),
        value: v.any()
    }).index('by_session_key', ['sessionId', 'key']),

    // Live data
    liveData: defineTable({
        sessionId: v.id('sessions'),
        data: v.any(),
        updatedAt: v.number()
    }).index('by_session', ['sessionId']),

    // Messages
    messages: defineTable({
        sessionId: v.id('sessions'),
        text: v.string(),
        sender: v.string(),
        createdAt: v.number()
    }).index('by_session', ['sessionId']),

    feedback: defineTable({
        sid: v.string(),
        appSid: v.string(),
        appVersionSid: v.string(),
        sessionId: v.optional(v.id('sessions')),
        studioSessionSid: v.optional(v.string()),
        authorEmail: v.string(),
        authorName: v.optional(v.string()),
        status: v.union(v.literal('pending'), v.literal('in_progress'), v.literal('resolved'), v.literal('dismissed')),
        comment: v.string(),
        annotations: v.array(
            v.object({
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
            })
        ),
        screenshot: v.optional(v.string()),
        sentToStudioAt: v.optional(v.number()),
        resolvedAt: v.optional(v.number()),
        createdAt: v.number(),
        updatedAt: v.number()
    })
        .index('by_sid', ['sid'])
        .index('by_app', ['appSid'])
        .index('by_app_version', ['appVersionSid'])
        .index('by_status', ['status']),

    // End-User Google Auth
    googleScopes: defineTable({
        sessionId: v.id('sessions'),
        scopes: v.array(v.string()),
        updatedAt: v.number()
    }).index('by_session', ['sessionId']),

    userAuth: defineTable({
        sessionId: v.id('sessions'),
        email: v.string(),
        name: v.string(),
        picture: v.string(),
        passportAuthorizationId: v.string(),
        scopes: v.array(v.string()),
        status: v.string(),
        createdAt: v.number(),
        updatedAt: v.number()
    })
        .index('by_session', ['sessionId'])
        .index('by_session_email', ['sessionId', 'email']),

    secrets: defineTable({
        key: v.string(),
        value: v.string(),
        updatedAt: v.number()
    }).index('by_key', ['key'])
});
