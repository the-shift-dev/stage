# 🎭 Stage

Sandboxed React runtime for AI agents.

Stage lets an agent (or human) create a session, write React/TS files into that session, and render the result live at a shareable URL.

---

## What Stage does

- Creates isolated app sessions (`/s/:sessionId`)
- Stores session files + render state in Convex
- Executes/render user React code in-browser
- Exposes a curated runtime scope (React, shadcn/ui, Recharts, lodash, PapaParse, Stage APIs)
- Supports multi-file apps with relative imports

---

## Quick start (local)

### 1) Start Stage

```bash
npm install
npm run dev
```

Stage UI: `http://localhost:3000`

### 2) Configure CLI env

Use either Convex Cloud or self-hosted Convex.

```bash
# self-hosted example
export CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
export CONVEX_SELF_HOSTED_ADMIN_KEY=<your-admin-key>
export STAGE_URL=http://127.0.0.1:3000
```

### 3) Create and render a session

```bash
stage new
# => session id + URL

stage write /app/App.tsx ./App.tsx --session <id>
stage render --session <id>
```

Open: `http://localhost:3000/s/<id>`

---

## Common CLI flow

```bash
# create session
stage new

# write files
stage write /app/App.tsx ./App.tsx --session <id>
stage push ./my-app /app --session <id>

# render + inspect
stage render --session <id>
stage status --session <id>
stage ls /app --session <id>
```

---

## Runtime imports available to user code

- `react`
- `recharts`
- `lodash`
- `papaparse`
- `lucide-react`
- many `@/components/ui/*` shadcn components
- `@stage/kv`
- `@stage/convex`
- `@stage/google` (when Google auth is enabled for the session)

---

## Architecture (high level)

1. CLI writes files + render mutations to Convex (`convex/stage.ts`)
2. Session page (`src/app/s/[session]/page.tsx`) subscribes to Convex state
3. `DynamicComponent` + `ValidatedRunner` compile and execute user TSX in the browser
4. Browser updates live as session files/render version change

---

## Development

```bash
npm run dev
npm run build
npm run lint
npm run ts
```

---

## Tests

Standard split:

- **Unit tests** (Vitest):
  ```bash
  npm run test:unit
  npm run test:unit -- --coverage
  ```
- **Integration tests** (Playwright):
  ```bash
  npm run test:integration
  ```

Integration tests require Convex + Stage env vars (e.g. `CONVEX_SELF_HOSTED_URL`, `CONVEX_SELF_HOSTED_ADMIN_KEY`, `STAGE_URL`).

---

## License

MIT
