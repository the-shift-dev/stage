import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new session
export const createSession = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("sessions", {
      createdAt: now,
      lastAccessedAt: now,
    });
  },
});

// Write a file to a session
export const writeFile = mutation({
  args: {
    sessionId: v.id("sessions"),
    path: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { sessionId, path, content }) => {
    const existing = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", sessionId).eq("path", path)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { content, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("files", {
        sessionId,
        path,
        content,
        updatedAt: Date.now(),
      });
    }

    // Touch session
    await ctx.db.patch(sessionId, { lastAccessedAt: Date.now() });
  },
});

// Read a file
export const readFile = query({
  args: {
    sessionId: v.id("sessions"),
    path: v.string(),
  },
  handler: async (ctx, { sessionId, path }) => {
    const file = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", sessionId).eq("path", path)
      )
      .first();
    return file?.content ?? null;
  },
});

// Trigger a render
export const triggerRender = mutation({
  args: {
    sessionId: v.id("sessions"),
    entry: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, entry }) => {
    const existing = await ctx.db
      .query("renderState")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    const newEntry = entry ?? existing?.entry ?? "/app/App.tsx";
    const newVersion = (existing?.version ?? 0) + 1;

    if (existing) {
      await ctx.db.patch(existing._id, { entry: newEntry, version: newVersion });
    } else {
      await ctx.db.insert("renderState", {
        sessionId,
        entry: newEntry,
        version: newVersion,
      });
    }

    // Touch session
    await ctx.db.patch(sessionId, { lastAccessedAt: Date.now() });

    return { entry: newEntry, version: newVersion };
  },
});

// Get render state (reactive!)
export const getRenderState = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const state = await ctx.db
      .query("renderState")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    if (!state) return null;

    const file = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", sessionId).eq("path", state.entry)
      )
      .first();

    return {
      entry: state.entry,
      version: state.version,
      code: file?.content ?? null,
    };
  },
});

// KV set
export const kvSet = mutation({
  args: {
    sessionId: v.id("sessions"),
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, { sessionId, key, value }) => {
    const existing = await ctx.db
      .query("kv")
      .withIndex("by_session_key", (q) =>
        q.eq("sessionId", sessionId).eq("key", key)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("kv", { sessionId, key, value });
    }
  },
});

// KV get
export const kvGet = query({
  args: {
    sessionId: v.id("sessions"),
    key: v.string(),
  },
  handler: async (ctx, { sessionId, key }) => {
    const doc = await ctx.db
      .query("kv")
      .withIndex("by_session_key", (q) =>
        q.eq("sessionId", sessionId).eq("key", key)
      )
      .first();
    return doc?.value ?? null;
  },
});

// ========== LIVE DATA ==========

// Set live data for a session
export const setLiveData = mutation({
  args: {
    sessionId: v.id("sessions"),
    data: v.any(),
  },
  handler: async (ctx, { sessionId, data }) => {
    const existing = await ctx.db
      .query("liveData")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { data, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("liveData", {
        sessionId,
        data,
        updatedAt: Date.now(),
      });
    }
  },
});

// Get live data (reactive!)
export const getLiveData = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const doc = await ctx.db
      .query("liveData")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    return doc?.data ?? null;
  },
});

// ========== MESSAGES ==========

// Send a message
export const sendMessage = mutation({
  args: {
    sessionId: v.id("sessions"),
    text: v.string(),
    sender: v.string(),
  },
  handler: async (ctx, { sessionId, text, sender }) => {
    await ctx.db.insert("messages", {
      sessionId,
      text,
      sender,
      createdAt: Date.now(),
    });
  },
});

// Get messages (reactive!)
export const getMessages = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .order("asc")
      .collect();
  },
});

// Clear messages
export const clearMessages = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
  },
});
