import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    createdAt: v.number(),
    lastAccessedAt: v.number(),
  }),

  files: defineTable({
    sessionId: v.id("sessions"),
    path: v.string(),
    content: v.string(),
    updatedAt: v.number(),
  }).index("by_session_path", ["sessionId", "path"]),

  renderState: defineTable({
    sessionId: v.id("sessions"),
    entry: v.string(),
    version: v.number(),
  }).index("by_session", ["sessionId"]),

  kv: defineTable({
    sessionId: v.id("sessions"),
    key: v.string(),
    value: v.any(),
  }).index("by_session_key", ["sessionId", "key"]),

  // Live data for real-time demos
  liveData: defineTable({
    sessionId: v.id("sessions"),
    data: v.any(),
    updatedAt: v.number(),
  }).index("by_session", ["sessionId"]),

  // Messages for chat-like demos
  messages: defineTable({
    sessionId: v.id("sessions"),
    text: v.string(),
    sender: v.string(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
