# 🎭 Stage

> A sandboxed React runtime for AI agents. Agent writes code, Stage performs it.

Stage is a Next.js app that runs React components in an isolated virtual filesystem. No build step, no deploy, no hosting. An agent writes files via CLI, Stage renders them live in the browser.

## How It Works

1. Agent creates a session → gets a URL (`/s/{session}`)
2. Agent writes files to the session's virtual FS via `stage-cli`
3. Stage renders the component live in the browser
4. Each session is fully isolated (separate just-bash instance + filesystem)

## Quick Start

```bash
# Start Stage
npm run dev

# In another terminal, install the CLI
npm install -g stage-cli

# Create a session
stage new
# ✓ Session created: abc123
#   URL: http://localhost:3000/s/abc123

# Write a component and render it
stage write /app/App.tsx ./App.tsx --session abc123
stage render --session abc123

# Or push an entire directory
stage push ./my-app /app --session abc123
```

Open `http://localhost:3000/s/abc123` to see the result.

## What's Available

Components rendered in Stage have access to:

- **React** — hooks, JSX, full runtime
- **[shadcn/ui](https://ui.shadcn.com/)** — Card, Button, Badge, Tabs, Dialog, and more
- **[Recharts](https://recharts.org/)** — BarChart, LineChart, PieChart, AreaChart
- **[Lodash](https://lodash.com/)** — utility functions
- **[PapaParse](https://www.papaparse.com/)** — CSV parsing
- **KV Store** — localStorage-backed, scoped per artifact
- **Virtual Bash** — ls, cat, grep, sed, find, pipes via [just-bash](https://github.com/nicholasgasior/just-bash)

## Architecture

```
stage-cli (any agent)
    │
    ├── POST /api/stage/sessions     → create session
    ├── POST /api/stage/files        → write files to virtual FS
    ├── GET  /api/stage/files        → read files from virtual FS
    ├── POST /api/stage/exec         → run bash commands
    └── POST /api/stage/render       → trigger render
         │
         ▼
    Stage Server (Next.js)
    ├── Session Map (globalThis)
    │   ├── session-abc → Bash instance + FS + render state
    │   ├── session-def → Bash instance + FS + render state
    │   └── ...
    │
    └── /s/[session] (browser)
        └── Polls render API → react-runner → live component
```

- **Session isolation** — each session gets its own `just-bash` instance with an independent in-memory filesystem
- **Sessions survive hot reloads** — stored on `globalThis`
- **Auto-expire** — sessions are cleaned up after 4 hours of inactivity

## CLI

See [stage-cli](https://github.com/the-shift-dev/stage-cli) for the full CLI documentation.

## License

MIT
