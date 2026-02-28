# Stage + Convex Migration

## TL;DR

Replace sandbox with Convex. Get: persistence, real-time sync, versioning, analytics, auth-ready.
No bundler needed for multi-file apps — react-runner resolves imports from scope.

---

## What We Proved

Convex replaces the sandbox entirely:
- **Files** → Convex file storage + metadata table
- **Render state** → Convex table (reactive via WebSocket)
- **KV store** → Convex table (persistent)
- **Live data** → Real-time subscriptions (~50ms, no polling)
- **Messages** → Full CRUD with instant sync

**Key insight:** Stage doesn't need `exec`. The sandbox was just storing files and tracking render state. React execution happens in the **browser** via react-runner.

---

## Running Locally

```bash
# Start Convex backend (Docker)
cd ~/Projects/convex-backend/self-hosted/docker
docker compose up -d

# Generate admin key (first time)
docker compose exec backend ./generate_admin_key.sh

# Start Stage
cd ~/Projects/stage
npm run dev
```

| Service | URL |
|---------|-----|
| Convex Backend | http://localhost:3210 |
| Convex Dashboard | http://localhost:6791 |
| Convex HTTP Actions | http://localhost:3211 |
| Stage | http://localhost:3000 |

**Admin Key:** `convex-self-hosted|01b772017a22efbe18ec5e6fa414b7c8ef4d032d012b9c055b1853dd8f6aad58a621c43e03`

---

## Current Schema (Working)

```typescript
// convex/schema.ts
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

liveData: defineTable({
  sessionId: v.id("sessions"),
  data: v.any(),
  updatedAt: v.number(),
}).index("by_session", ["sessionId"]),

messages: defineTable({
  sessionId: v.id("sessions"),
  text: v.string(),
  sender: v.string(),
  createdAt: v.number(),
}).index("by_session", ["sessionId"]),
```

---

## Future Schema: Multi-File + Versioning

Use Convex File Storage for content (handles any size, binary files, CDN, deduplication):

```typescript
// convex/schema.ts
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

// Snapshots (like git commits)
snapshots: defineTable({
  sessionId: v.id("sessions"),
  name: v.optional(v.string()),  // "v1.0", "before refactor"
  files: v.array(v.object({ 
    path: v.string(), 
    storageId: v.id("_storage") 
  })),
  createdAt: v.number(),
}).index("by_session", ["sessionId"]),
```

**Mutations:**
- `writeFile` → stores in file storage, creates version
- `getFileHistory(path)` → all versions of a file
- `getFileAtVersion(path, version)` → specific version
- `createSnapshot(name)` → freeze current state
- `restoreSnapshot(snapshotId)` → rollback

**Benefits:**
- ✅ Any file size
- ✅ Binary files (images, fonts)
- ✅ Built-in CDN URLs
- ✅ Auto deduplication
- ✅ Full version history
- ✅ Named snapshots (like git tags)

---

## Multi-File Apps: No Bundler Needed

react-runner resolves imports from `scope.import`. Just add compiled files:

```typescript
// In DynamicComponent or session page
const files = useQuery(api.stage.getAllFiles, { sessionId });

const scope = {
  import: {
    // Pre-existing libraries
    react: ReactExports,
    'lucide-react': LucideIcons,
    '@/components/ui/button': { Button },
    // ... etc

    // Session files (compiled with sucrase)
    './Button': compileModule(files['/app/Button.tsx']),
    './utils': compileModule(files['/app/utils.ts']),
    './hooks/useData': compileModule(files['/app/hooks/useData.ts']),
  }
};
```

**Flow:**
1. Fetch all files for session from Convex
2. Compile each with sucrase (already in Stage)
3. Add to `scope.import` with relative paths
4. react-runner renders entry point, resolves imports from scope

No webpack. No esbuild. Just a loop.

---

## Component Access to Live Data

Components import from `@stage/convex`:

```tsx
import { liveData, messages, sendMessage, setLiveData } from '@stage/convex';

export default function MyApp() {
  // liveData - reactive object, updates instantly
  // messages - reactive array
  // sendMessage(text, sender) - mutation
  // setLiveData(data) - mutation
  
  return <div>{liveData?.count}</div>;
}
```

---

## Files Changed

### New Files
```
convex/
├── schema.ts                    # Data model
├── stage.ts                     # Mutations + queries
└── _generated/                  # Auto-generated types

src/components/
└── ConvexClientProvider.tsx     # React provider

src/app/
└── debug/page.tsx               # Debug page (optional)
```

### Modified Files
```
src/app/layout.tsx               # Wrapped with ConvexClientProvider
src/app/s/[session]/page.tsx     # useQuery instead of polling
src/components/DynamicComponent.tsx  # Added convexContext to scope
src/lib/allowedImports.ts        # Added @stage/convex
next.config.ts                   # CSP: added localhost:* to connect-src
.env.local                       # Convex URLs + admin key
package.json                     # Added convex dependency
```

---

## What To Remove (After Full Migration)

```bash
# Delete sandbox code
rm src/lib/server-runtime.ts
rm -rf src/app/api/stage/

# Remove dependencies
npm uninstall @vercel/sandbox just-bash
```

---

## CLI Migration

Update `stage` CLI to call Convex mutations directly:

```bash
# Current (calls API routes)
stage write /app/App.tsx ./App.tsx --session abc123
stage render --session abc123

# Future (calls Convex directly)
# Same commands, but internally uses ConvexHttpClient
```

```typescript
// stage CLI internals
import { ConvexHttpClient } from "convex/browser";
const client = new ConvexHttpClient(process.env.CONVEX_URL);

// write command
await client.mutation(api.stage.writeFile, { sessionId, path, content });

// render command  
await client.mutation(api.stage.triggerRender, { sessionId });
```

---

## Test Commands

```bash
# Create session
SESSION=$(curl -s -X POST "http://localhost:3210/api/mutation" \
  -H "Content-Type: application/json" \
  -d '{"path":"stage:createSession","args":{}}' | jq -r '.value')

# Write file
curl -s -X POST "http://localhost:3210/api/mutation" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"stage:writeFile\",\"args\":{\"sessionId\":\"$SESSION\",\"path\":\"/app/App.tsx\",\"content\":\"export default () => <h1>Hello Convex!</h1>\"}}"

# Trigger render
curl -s -X POST "http://localhost:3210/api/mutation" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"stage:triggerRender\",\"args\":{\"sessionId\":\"$SESSION\"}}"

# Send live message
curl -s -X POST "http://localhost:3210/api/mutation" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"stage:sendMessage\",\"args\":{\"sessionId\":\"$SESSION\",\"text\":\"Hello!\",\"sender\":\"Bot\"}}"

# Update live data
curl -s -X POST "http://localhost:3210/api/mutation" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"stage:setLiveData\",\"args\":{\"sessionId\":\"$SESSION\",\"data\":{\"count\":42,\"status\":\"active\"}}}"

# Open in browser
open "http://localhost:3000/s/$SESSION"
```

---

## Working Demo Session

```
http://127.0.0.1:3000/s/jh747tdna0wxq0474s3hdfv1px821y00
```

Features demonstrated:
- Real-time chat (messages sync instantly)
- Live dashboard (metrics update via API)
- WebSocket sync (~50ms latency)
- Persistent data (survives restarts)

---

## Benefits Summary

| Before (Sandbox) | After (Convex) |
|------------------|----------------|
| Polling 2-10s | WebSocket ~50ms |
| Ephemeral state | Persistent |
| No analytics | Full dashboard |
| No auth | Convex Auth ready |
| Vercel Sandbox cost | Self-host free |
| Single file only | Multi-file + versions |
| No history | Full version history |

---

## Next Steps

1. ☐ Migrate to file storage for content
2. ☐ Add version history
3. ☐ Add snapshots
4. ☐ Multi-file scope injection
5. ☐ CLI migration to Convex
6. ☐ Add Convex Auth
7. ☐ Remove old sandbox code
8. ☐ Production deploy (Convex Cloud or self-host)
