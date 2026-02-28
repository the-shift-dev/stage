# Stage + Convex Migration

## TL;DR

Replace sandbox with Convex. Get: persistence, real-time sync, versioning, analytics, auth-ready.

## Future: Multi-File Apps with Versioning

Use Convex File Storage for content, tables for metadata:

```typescript
// Schema
files: defineTable({
  sessionId: v.id("sessions"),
  path: v.string(),
  storageId: v.id("_storage"),  // Convex file storage
  version: v.number(),
  size: v.number(),
  createdAt: v.number(),
})
  .index("by_session_path", ["sessionId", "path"])
  .index("by_session_version", ["sessionId", "path", "version"]),

snapshots: defineTable({
  sessionId: v.id("sessions"),
  name: v.optional(v.string()),
  files: v.array(v.object({ path: v.string(), storageId: v.id("_storage") })),
  createdAt: v.number(),
}),
```

**Benefits:**
- Any file size
- Binary files (images)
- Built-in CDN
- Auto deduplication
- Version history
- Snapshots (like git commits)

**Rendering multi-file apps:**
1. Fetch all files for session
2. Bundle with esbuild/sucrase
3. Pass to react-runner

---

## What We Proved

Convex replaces the sandbox entirely for Stage's core use case:
- **Files** → Convex table (persistent, queryable)
- **Render state** → Convex table (reactive via WebSocket)
- **KV store** → Convex table (persistent)
- **Live data** → Real-time subscriptions (no polling!)
- **Messages** → Full CRUD with instant sync

## What's Running

```bash
# Convex backend (Docker)
cd ~/Projects/convex-backend/self-hosted/docker
docker compose up -d

# Generate admin key
docker compose exec backend ./generate_admin_key.sh
```

- Backend: http://localhost:3210
- Dashboard: http://localhost:6791
- HTTP Actions: http://localhost:3211

## Files Added/Modified

### New Convex Files
```
convex/
├── schema.ts      # sessions, files, renderState, kv, liveData, messages
├── stage.ts       # All mutations/queries
└── _generated/    # Auto-generated types
```

### Modified Stage Files
```
src/
├── components/
│   ├── ConvexClientProvider.tsx  # NEW - Convex React provider
│   └── DynamicComponent.tsx      # Added convexContext to scope
├── app/
│   ├── layout.tsx                # Wrapped with ConvexClientProvider
│   └── s/[session]/page.tsx      # useQuery instead of polling
└── lib/
    └── allowedImports.ts         # Added @stage/convex
```

### Config
```
.env.local:
  CONVEX_SELF_HOSTED_URL=http://localhost:3210
  CONVEX_SELF_HOSTED_ADMIN_KEY=convex-self-hosted|...
  NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210

next.config.ts:
  CSP connect-src: added localhost:* and 127.0.0.1:*
```

## Schema

```typescript
// convex/schema.ts
sessions: { createdAt, lastAccessedAt }
files: { sessionId, path, content, updatedAt } // index: by_session_path
renderState: { sessionId, entry, version }     // index: by_session
kv: { sessionId, key, value }                  // index: by_session_key
liveData: { sessionId, data, updatedAt }       // index: by_session
messages: { sessionId, text, sender, createdAt } // index: by_session
```

## Component Access to Live Data

Components import from `@stage/convex`:
```tsx
import { liveData, messages, sendMessage, setLiveData } from '@stage/convex';

// liveData - reactive, updates instantly
// messages - array of messages, reactive
// sendMessage(text, sender) - mutation
// setLiveData(data) - mutation
```

## What To Remove

Once migration is complete, delete:
- `src/lib/server-runtime.ts` (sandbox logic)
- `src/app/api/stage/*` (old API routes)
- `@vercel/sandbox` dependency
- `just-bash` dependency

## What Still Needs Work

1. **CLI migration** - `stage` CLI should call Convex mutations directly
2. **Session creation** - Need an endpoint or CLI command
3. **File operations** - CLI `write`, `push`, `render` → Convex mutations
4. **Auth** - Convex Auth for user ownership of sessions
5. **Production deploy** - Self-host Convex or use Convex Cloud

## Key Insight: No Exec Needed

Stage doesn't actually need `exec` (bash commands). The sandbox was just:
1. Storing files
2. Tracking render state

React execution happens in the **browser** via react-runner. Convex handles storage + real-time sync.

## Test It

```bash
# Create session
SESSION=$(curl -s -X POST "http://localhost:3210/api/mutation" \
  -H "Content-Type: application/json" \
  -d '{"path":"stage:createSession","args":{}}' | jq -r '.value')

# Write file
curl -s -X POST "http://localhost:3210/api/mutation" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"stage:writeFile\",\"args\":{\"sessionId\":\"$SESSION\",\"path\":\"/app/App.tsx\",\"content\":\"export default () => <h1>Hello</h1>\"}}"

# Trigger render
curl -s -X POST "http://localhost:3210/api/mutation" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"stage:triggerRender\",\"args\":{\"sessionId\":\"$SESSION\"}}"

# Open in browser
open "http://localhost:3000/s/$SESSION"
```

## Benefits

| Before (Sandbox) | After (Convex) |
|------------------|----------------|
| Polling 2-10s | WebSocket ~50ms |
| Ephemeral state | Persistent |
| No analytics | Full dashboard |
| No auth | Convex Auth ready |
| Vercel Sandbox cost | Self-host free |
