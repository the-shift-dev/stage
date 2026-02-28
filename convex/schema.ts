import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    createdAt: v.number(),
    lastAccessedAt: v.number(),
  }),

  // Files with versioning (inline content for now, can migrate to storage later)
  files: defineTable({
    sessionId: v.id("sessions"),
    path: v.string(),
    content: v.string(),
    version: v.optional(v.number()),      // optional for old data
    createdAt: v.optional(v.number()),    // optional for old data
    updatedAt: v.optional(v.number()),    // legacy field
  })
    .index("by_session", ["sessionId"])
    .index("by_session_path", ["sessionId", "path"]),

  // Snapshots (like git commits)
  snapshots: defineTable({
    sessionId: v.id("sessions"),
    name: v.optional(v.string()),
    files: v.array(
      v.object({
        path: v.string(),
        content: v.string(),
        version: v.number(),
      })
    ),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),

  // Render state
  renderState: defineTable({
    sessionId: v.id("sessions"),
    entry: v.string(),
    version: v.number(),
  }).index("by_session", ["sessionId"]),

  // KV store
  kv: defineTable({
    sessionId: v.id("sessions"),
    key: v.string(),
    value: v.any(),
  }).index("by_session_key", ["sessionId", "key"]),

  // Live data
  liveData: defineTable({
    sessionId: v.id("sessions"),
    data: v.any(),
    updatedAt: v.number(),
  }).index("by_session", ["sessionId"]),

  // Messages
  messages: defineTable({
    sessionId: v.id("sessions"),
    text: v.string(),
    sender: v.string(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
