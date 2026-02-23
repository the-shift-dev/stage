/**
 * Server-side runtime with session isolation.
 * Each session gets its own Sandbox instance.
 *
 * Set STAGE_RUNTIME=vercel to use Vercel Sandbox (real VMs).
 * Default: just-bash (in-memory, zero infra).
 */

const RUNTIME = (process.env.STAGE_RUNTIME || 'local').trim();
const RENDER_STATE_PATH = '/app/.stage/render.json';
const SANDBOX_TIMEOUT_MS = 45 * 60 * 1000; // 45 min (Hobby max)

// Unified sandbox interface — both just-bash and @vercel/sandbox conform to this
interface SandboxLike {
    runCommand(cmd: string): Promise<{ exitCode: number; stdout: string; stderr: string }>;
    writeFiles(files: Record<string, string>): Promise<void>;
    readFile(path: string): Promise<string>;
    stop(): Promise<void>;
}

interface RenderState {
    entry: string;
    version: number;
}

const DEFAULT_RENDER_STATE: RenderState = {
    entry: '/app/App.tsx',
    version: 0
};

// --- Vercel Sandbox adapter with connection cache ---

const globalCache = globalThis as typeof globalThis & {
    __vercelSandboxCache?: Map<string, { sandbox: SandboxLike; cachedAt: number }>;
};
if (!globalCache.__vercelSandboxCache) {
    globalCache.__vercelSandboxCache = new Map();
}
const sandboxCache = globalCache.__vercelSandboxCache;
const CACHE_TTL = 1000 * 60 * 5; // cache handles for 5 min

async function importVercelSandbox() {
    return await import('@vercel/sandbox');
}

async function createVercelSandbox(): Promise<{
    id: string;
    sandbox: SandboxLike;
}> {
    const { Sandbox } = await importVercelSandbox();
    const raw = await Sandbox.create({ timeout: SANDBOX_TIMEOUT_MS });
    const id = raw.sandboxId;

    // Render state is written lazily on first triggerRender call.
    // getRenderState handles the missing file gracefully.

    const wrapped = wrapVercelSandbox(raw);
    sandboxCache.set(id, { sandbox: wrapped, cachedAt: Date.now() });
    return { id, sandbox: wrapped };
}

async function getVercelSandbox(sandboxId: string): Promise<SandboxLike> {
    // Return cached handle if fresh
    const cached = sandboxCache.get(sandboxId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
        return cached.sandbox;
    }

    // Reconnect
    const { Sandbox } = await importVercelSandbox();
    const raw = await Sandbox.get({ sandboxId });
    const wrapped = wrapVercelSandbox(raw);
    sandboxCache.set(sandboxId, { sandbox: wrapped, cachedAt: Date.now() });
    return wrapped;
}

// Vercel Sandbox writes relative to /vercel/sandbox — strip leading /
function toRelative(p: string): string {
    return p.startsWith('/') ? p.slice(1) : p;
}

function wrapVercelSandbox(sandbox: any): SandboxLike {
    return {
        async runCommand(cmd: string) {
            const result = await sandbox.runCommand('bash', ['-c', cmd]);
            return {
                exitCode: result.exitCode,
                stdout: await result.stdout(),
                stderr: await result.stderr()
            };
        },
        async writeFiles(files: Record<string, string>) {
            const entries = Object.entries(files).map(([path, content]) => ({
                path: toRelative(path),
                content: Buffer.from(content)
            }));
            await sandbox.writeFiles(entries);
        },
        async readFile(path: string) {
            const buf = await sandbox.readFileToBuffer({ path: toRelative(path) });
            if (!buf) throw new Error(`ENOENT: no such file or directory, open '${path}'`);
            return buf.toString('utf-8');
        },
        async stop() {
            await sandbox.stop();
        }
    };
}

// --- Local (just-bash) adapter ---

interface LocalSession {
    sandbox: SandboxLike;
    renderState: RenderState;
    listeners: Set<(data: RenderState) => void>;
    createdAt: number;
    lastAccessedAt: number;
}

// Survive Next.js hot reloads in dev mode
const globalStore = globalThis as typeof globalThis & {
    __stageSessions?: Map<string, LocalSession>;
    __stageCleanup?: boolean;
};
if (!globalStore.__stageSessions) {
    globalStore.__stageSessions = new Map();
}
const localSessions = globalStore.__stageSessions;

const SESSION_TTL = 1000 * 60 * 60 * 4; // 4 hours
const CLEANUP_INTERVAL = 1000 * 60 * 15; // every 15 min

if (!globalStore.__stageCleanup) {
    globalStore.__stageCleanup = true;
    setInterval(() => {
        const now = Date.now();
        for (const [id, session] of localSessions) {
            if (now - session.lastAccessedAt > SESSION_TTL) {
                session.sandbox.stop().catch(() => {});
                localSessions.delete(id);
            }
        }
    }, CLEANUP_INTERVAL);
}

async function createLocalSandbox(): Promise<SandboxLike> {
    const { Bash } = await import('just-bash/browser');
    const bash = new Bash({ cwd: '/app' });
    const fs = (bash as any).fs;
    return {
        async runCommand(cmd: string) {
            const result = await bash.exec(cmd);
            return {
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr
            };
        },
        async writeFiles(files: Record<string, string>) {
            for (const [path, content] of Object.entries(files)) {
                const dir = path.substring(0, path.lastIndexOf('/'));
                if (dir) await fs.mkdir(dir, { recursive: true });
                await fs.writeFile(path, content);
            }
        },
        async readFile(path: string) {
            return await fs.readFile(path);
        },
        async stop() {
            // no-op for in-memory
        }
    };
}

async function getLocalSession(sessionId: string): Promise<LocalSession> {
    let session = localSessions.get(sessionId);
    if (!session) {
        session = {
            sandbox: await createLocalSandbox(),
            renderState: { ...DEFAULT_RENDER_STATE },
            listeners: new Set(),
            createdAt: Date.now(),
            lastAccessedAt: Date.now()
        };
        localSessions.set(sessionId, session);
    }
    session.lastAccessedAt = Date.now();
    return session;
}

// --- Public API ---

export async function createSession(): Promise<string> {
    if (RUNTIME === 'vercel') {
        const { id } = await createVercelSandbox();
        return id;
    }
    const id = crypto.randomUUID().slice(0, 8);
    await getLocalSession(id);
    return id;
}

async function getSandbox(sessionId: string): Promise<SandboxLike> {
    if (RUNTIME === 'vercel') {
        return await getVercelSandbox(sessionId);
    }
    return (await getLocalSession(sessionId)).sandbox;
}

export async function exec(sessionId: string, command: string) {
    const sandbox = await getSandbox(sessionId);
    return await sandbox.runCommand(command);
}

export async function writeFiles(sessionId: string, files: Record<string, string>) {
    const sandbox = await getSandbox(sessionId);
    await sandbox.writeFiles(files);
}

export async function readFile(sessionId: string, path: string): Promise<string> {
    const sandbox = await getSandbox(sessionId);
    return await sandbox.readFile(path);
}

export async function triggerRender(sessionId: string, entry?: string) {
    if (RUNTIME === 'vercel') {
        const sandbox = await getVercelSandbox(sessionId);
        let state: RenderState;
        try {
            const raw = await sandbox.readFile(RENDER_STATE_PATH);
            state = JSON.parse(raw);
        } catch {
            state = { ...DEFAULT_RENDER_STATE };
        }
        if (entry) state.entry = entry;
        state.version++;
        await sandbox.writeFiles({
            [RENDER_STATE_PATH]: JSON.stringify(state)
        });
        return;
    }

    const session = await getLocalSession(sessionId);
    if (entry) session.renderState.entry = entry;
    session.renderState.version++;
    session.listeners.forEach((fn) => fn({ ...session.renderState }));
}

export async function getRenderState(sessionId: string): Promise<RenderState> {
    if (RUNTIME === 'vercel') {
        const sandbox = await getVercelSandbox(sessionId);
        try {
            const raw = await sandbox.readFile(RENDER_STATE_PATH);
            return JSON.parse(raw);
        } catch {
            return { ...DEFAULT_RENDER_STATE };
        }
    }

    const session = localSessions.get(sessionId);
    if (!session) return { ...DEFAULT_RENDER_STATE };
    return { ...session.renderState };
}

export function subscribe(sessionId: string, fn: (data: RenderState) => void) {
    // SSE subscriptions only work for local runtime (same process)
    // Vercel runtime uses polling via getRenderState
    if (RUNTIME === 'vercel') return () => {};

    const session = localSessions.get(sessionId);
    if (!session) return () => {};
    session.listeners.add(fn);
    return () => session.listeners.delete(fn);
}
