/**
 * Stage Runtime — just-bash powered virtual environment.
 * Uses Bash with InMemoryFs for file operations and command execution.
 */

let bash: any = null;
let onChangeCallbacks: Set<() => void> = new Set();

async function getBash() {
    if (!bash) {
        const mod = await import('just-bash/browser');
        bash = new mod.Bash({ cwd: '/app' });
    }
    return bash;
}

/**
 * Run a bash command. Returns { stdout, stderr, exitCode }.
 */
export async function runCommand(command: string) {
    const b = await getBash();
    const result = await b.exec(command);
    notifyChange();
    return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
    };
}

/**
 * Write multiple files at once.
 */
export async function writeFiles(files: Record<string, string>) {
    const b = await getBash();
    for (const [path, content] of Object.entries(files)) {
        const dir = path.substring(0, path.lastIndexOf('/'));
        if (dir) {
            await b.exec(`mkdir -p "${dir}"`);
        }
        // Use base64 to avoid any escaping issues
        const encoded = btoa(unescape(encodeURIComponent(content)));
        await b.exec(`echo "${encoded}" | base64 -d > "${path}"`);
    }
    notifyChange();
}

/**
 * Read a file.
 */
export async function readFile(path: string): Promise<string> {
    const b = await getBash();
    const result = await b.exec(`cat "${path}"`);
    if (result.exitCode !== 0) {
        throw new Error(result.stderr || `File not found: ${path}`);
    }
    return result.stdout;
}

/**
 * Create a directory.
 */
export async function mkDir(path: string) {
    const b = await getBash();
    await b.exec(`mkdir -p "${path}"`);
}

/**
 * List files in a directory.
 */
export async function listFiles(dir: string = '/app'): Promise<string[]> {
    const b = await getBash();
    const result = await b.exec(`find "${dir}" -type f 2>/dev/null`);
    if (!result.stdout.trim()) return [];
    return result.stdout.trim().split('\n');
}

/**
 * Subscribe to FS changes. Returns unsubscribe function.
 */
export function onChange(callback: () => void): () => void {
    onChangeCallbacks.add(callback);
    return () => onChangeCallbacks.delete(callback);
}

function notifyChange() {
    onChangeCallbacks.forEach((cb) => {
        try {
            cb();
        } catch (e) {
            console.error('Stage runtime onChange error:', e);
        }
    });
}
