# Stage + Convex Migration

## Status: ✅ WORKING

Multi-file apps with versioning, real-time sync, all functional.

---

## What Works Now

| Feature | Status |
|---------|--------|
| Files in Convex | ✅ |
| Version history | ✅ |
| Multi-file imports | ✅ |
| Real-time sync | ✅ |
| Live data | ✅ |
| Messages | ✅ |
| KV store | ✅ |
| Snapshots | ✅ |

---

## Quick Start

```bash
# Start Convex backend
cd ~/Projects/convex-backend/self-hosted/docker
docker compose up -d

# Start Stage
cd ~/Projects/stage
npm run dev

# Create session + write files
SESSION=$(curl -s -X POST "http://127.0.0.1:3210/api/mutation" \
  -H "Content-Type: application/json" \
  -d '{"path":"stage:createSession","args":{}}' | jq -r '.value')

# Write a component
curl -s -X POST "http://127.0.0.1:3210/api/mutation" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"stage:writeFile\",\"args\":{\"sessionId\":\"$SESSION\",\"path\":\"/app/App.tsx\",\"content\":\"export default () => <h1>Hello!</h1>\"}}"

# Trigger render
curl -s -X POST "http://127.0.0.1:3210/api/mutation" \
  -H "Content-Type: application/json" \
  -d "{\"path\":\"stage:triggerRender\",\"args\":{\"sessionId\":\"$SESSION\"}}"

# Open
open "http://127.0.0.1:3000/s/$SESSION"
```

---

## Multi-File Example

```bash
# Button.tsx
curl -X POST "http://127.0.0.1:3210/api/mutation" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "stage:writeFile",
    "args": {
      "sessionId": "'$SESSION'",
      "path": "/app/Button.tsx",
      "content": "import { Button } from \"@/components/ui/button\";\nexport function MyButton({ label }) {\n  return <Button>{label}</Button>;\n}"
    }
  }'

# App.tsx (imports Button)
curl -X POST "http://127.0.0.1:3210/api/mutation" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "stage:writeFile",
    "args": {
      "sessionId": "'$SESSION'",
      "path": "/app/App.tsx",
      "content": "import { MyButton } from \"./Button\";\nexport default () => <MyButton label=\"Click me\" />"
    }
  }'
```

---

## Schema

```typescript
// convex/schema.ts
files: defineTable({
  sessionId: v.id("sessions"),
  path: v.string(),
  content: v.string(),
  version: v.optional(v.number()),
  createdAt: v.optional(v.number()),
})
  .index("by_session", ["sessionId"])
  .index("by_session_path", ["sessionId", "path"]),

snapshots: defineTable({
  sessionId: v.id("sessions"),
  name: v.optional(v.string()),
  files: v.array(v.object({
    path: v.string(),
    content: v.string(),
    version: v.number(),
  })),
  createdAt: v.number(),
}).index("by_session", ["sessionId"]),
```

---

## API Reference

### Files
- `writeFile(sessionId, path, content)` → creates new version
- `readFile(sessionId, path)` → latest version
- `readFileAtVersion(sessionId, path, version)` → specific version
- `getFileHistory(sessionId, path)` → all versions
- `getAllFiles(sessionId)` → latest of each file

### Snapshots
- `createSnapshot(sessionId, name?)` → freeze current state
- `getSnapshots(sessionId)` → list snapshots
- `restoreSnapshot(snapshotId)` → rollback

### Render
- `triggerRender(sessionId, entry?)` → trigger re-render
- `getRenderState(sessionId)` → current render state

### Live Data
- `setLiveData(sessionId, data)` → update reactive data
- `getLiveData(sessionId)` → get reactive data

### Messages
- `sendMessage(sessionId, text, sender)` → send message
- `getMessages(sessionId)` → get all messages
- `clearMessages(sessionId)` → clear messages

### KV
- `kvSet(sessionId, key, value)` → set value
- `kvGet(sessionId, key)` → get value

---

## Component Access

```tsx
// Import live data in components
import { liveData, messages, sendMessage, setLiveData } from '@stage/convex';

// Use in component
export default function App() {
  return (
    <div>
      <p>Count: {liveData?.count}</p>
      <button onClick={() => setLiveData({ count: (liveData?.count || 0) + 1 })}>
        Increment
      </button>
      <ul>
        {messages?.map((m, i) => <li key={i}>{m.sender}: {m.text}</li>)}
      </ul>
    </div>
  );
}
```

---

## Architecture

```
┌─────────────┐    mutations     ┌──────────────┐
│ CLI / API   │ ───────────────▶ │   Convex     │
└─────────────┘                  │   Backend    │
                                 └──────┬───────┘
                                        │ WebSocket
┌─────────────┐    useQuery      ┌──────▼───────┐
│   Stage     │ ◀─────────────── │   Browser    │
│  Component  │                  │  (reactive)  │
└─────────────┘                  └──────────────┘
```

---

## Services

| Service | URL |
|---------|-----|
| Convex Backend | http://localhost:3210 |
| Convex Dashboard | http://localhost:6791 |
| Stage | http://localhost:3000 |

**Admin Key:** `convex-self-hosted|01b772017a22efbe18ec5e6fa414b7c8ef4d032d012b9c055b1853dd8f6aad58a621c43e03`

---

## What To Remove (cleanup)

```bash
# Old sandbox code (no longer needed)
rm src/lib/server-runtime.ts
rm -rf src/app/api/stage/

# Old dependencies
npm uninstall @vercel/sandbox just-bash
```

---

## Remaining Tasks

- [ ] CLI migration (stage CLI → Convex mutations)
- [ ] Add Convex Auth for user sessions
- [ ] Production deploy
- [ ] File storage for large files (self-hosted API differs)
