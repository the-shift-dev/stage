import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============ Sessions ============

export const createSession = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sessionId = await ctx.db.insert("sessions", {
      createdAt: now,
      lastAccessedAt: now,
    });
    return sessionId;
  },
});

export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});

// ============ Files (with versioning) ============

export const writeFile = mutation({
  args: {
    sessionId: v.id("sessions"),
    path: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { sessionId, path, content }) => {
    // Get latest version for this path
    const existing = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", sessionId).eq("path", path)
      )
      .order("desc")
      .first();

    const newVersion = existing && existing.version ? existing.version + 1 : 1;

    // Insert new version
    await ctx.db.insert("files", {
      sessionId,
      path,
      content,
      version: newVersion,
      createdAt: Date.now(),
    });

    // Update session access time
    await ctx.db.patch(sessionId, { lastAccessedAt: Date.now() });

    return { path, version: newVersion, size: content.length };
  },
});

export const readFile = query({
  args: {
    sessionId: v.id("sessions"),
    path: v.string(),
  },
  handler: async (ctx, { sessionId, path }) => {
    return await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", sessionId).eq("path", path)
      )
      .order("desc")
      .first();
  },
});

export const readFileAtVersion = query({
  args: {
    sessionId: v.id("sessions"),
    path: v.string(),
    version: v.number(),
  },
  handler: async (ctx, { sessionId, path, version }) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", sessionId).eq("path", path)
      )
      .collect();

    return files.find((f) => f.version === version) || null;
  },
});

export const getFileHistory = query({
  args: {
    sessionId: v.id("sessions"),
    path: v.string(),
  },
  handler: async (ctx, { sessionId, path }) => {
    return await ctx.db
      .query("files")
      .withIndex("by_session_path", (q) =>
        q.eq("sessionId", sessionId).eq("path", path)
      )
      .order("desc")
      .collect();
  },
});

export const getAllFiles = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const allFiles = await ctx.db
      .query("files")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
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
  },
});

// ============ Snapshots ============

export const createSnapshot = mutation({
  args: {
    sessionId: v.id("sessions"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, name }) => {
    const allFiles = await ctx.db
      .query("files")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
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
      version: f.version,
    }));

    const snapshotId = await ctx.db.insert("snapshots", {
      sessionId,
      name,
      files,
      createdAt: Date.now(),
    });

    return snapshotId;
  },
});

export const getSnapshots = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("snapshots")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .collect();
  },
});

export const restoreSnapshot = mutation({
  args: { snapshotId: v.id("snapshots") },
  handler: async (ctx, { snapshotId }) => {
    const snapshot = await ctx.db.get(snapshotId);
    if (!snapshot) throw new Error("Snapshot not found");

    for (const file of snapshot.files) {
      const existing = await ctx.db
        .query("files")
        .withIndex("by_session_path", (q) =>
          q.eq("sessionId", snapshot.sessionId).eq("path", file.path)
        )
        .order("desc")
        .first();

      const newVersion = existing && existing.version ? existing.version + 1 : 1;

      await ctx.db.insert("files", {
        sessionId: snapshot.sessionId,
        path: file.path,
        content: file.content,
        version: newVersion,
        createdAt: Date.now(),
      });
    }

    return { restored: snapshot.files.length };
  },
});

// ============ Render State ============

export const triggerRender = mutation({
  args: {
    sessionId: v.id("sessions"),
    entry: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, entry }) => {
    const entryPoint = entry || "/app/App.tsx";

    const existing = await ctx.db
      .query("renderState")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        entry: entryPoint,
        version: existing.version + 1,
      });
      return { entry: entryPoint, version: existing.version + 1 };
    } else {
      await ctx.db.insert("renderState", {
        sessionId,
        entry: entryPoint,
        version: 1.0,
      });
      return { entry: entryPoint, version: 1.0 };
    }
  },
});

export const getRenderState = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("renderState")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
  },
});

// ============ KV Store ============

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

export const kvGet = query({
  args: {
    sessionId: v.id("sessions"),
    key: v.string(),
  },
  handler: async (ctx, { sessionId, key }) => {
    const entry = await ctx.db
      .query("kv")
      .withIndex("by_session_key", (q) =>
        q.eq("sessionId", sessionId).eq("key", key)
      )
      .first();
    return entry?.value ?? null;
  },
});

// ============ Live Data ============

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

export const getLiveData = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const entry = await ctx.db
      .query("liveData")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    return entry?.data ?? null;
  },
});

// ============ Messages ============

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
