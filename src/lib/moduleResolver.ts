import { transform } from 'sucrase';

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function normalizePosix(input: string): string {
    const absolute = input.startsWith('/');
    const segments = input.split('/');
    const out: string[] = [];

    for (const segment of segments) {
        if (!segment || segment === '.') continue;
        if (segment === '..') {
            if (out.length > 0) out.pop();
            continue;
        }
        out.push(segment);
    }

    const normalized = `${absolute ? '/' : ''}${out.join('/')}`;
    return normalized || (absolute ? '/' : '.');
}

function dirnamePosix(input: string): string {
    const normalized = normalizePosix(input);
    if (normalized === '/') return '/';
    const idx = normalized.lastIndexOf('/');
    if (idx <= 0) return '/';
    return normalized.slice(0, idx);
}

function resolvePosix(fromDir: string, specifier: string): string {
    if (specifier.startsWith('/')) return normalizePosix(specifier);
    return normalizePosix(`${fromDir}/${specifier}`);
}

function normalizeFilePath(filePath: string): string {
    const normalized = normalizePosix(filePath);
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function hasKnownExtension(filePath: string): boolean {
    return EXTENSIONS.some((ext) => filePath.endsWith(ext));
}

function resolveFilePath(specifier: string, fromPath: string, files: Record<string, string>): string | null {
    const normalizedFrom = normalizeFilePath(fromPath);
    const fromDir = dirnamePosix(normalizedFrom);

    let basePath: string;
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
        basePath = resolvePosix(fromDir, specifier);
    } else if (specifier.startsWith('/')) {
        basePath = normalizeFilePath(specifier);
    } else {
        return null;
    }

    const candidates: string[] = [];
    candidates.push(basePath);

    if (!hasKnownExtension(basePath)) {
        for (const ext of EXTENSIONS) {
            candidates.push(`${basePath}${ext}`);
        }
    }

    const indexBase = basePath.endsWith('/') ? `${basePath}index` : `${basePath}/index`;
    for (const ext of EXTENSIONS) {
        candidates.push(`${indexBase}${ext}`);
    }

    for (const candidate of candidates.map(normalizeFilePath)) {
        if (Object.prototype.hasOwnProperty.call(files, candidate)) {
            return candidate;
        }
    }

    return null;
}

export interface VirtualModuleSystem {
    requireFrom: (fromPath: string, specifier: string) => any;
    requireFor: (fromPath: string) => (specifier: string) => any;
    resolveImport: (fromPath: string, specifier: string) => string | null;
}

export function createVirtualModuleSystem({
    files,
    externals,
    react,
}: {
    files: Record<string, string>;
    externals: Record<string, any>;
    react: any;
}): VirtualModuleSystem {
    const normalizedFiles = Object.fromEntries(
        Object.entries(files).map(([filePath, content]) => [normalizeFilePath(filePath), content]),
    );

    const transformedCache = new Map<string, string>();
    const moduleCache = new Map<string, any>();

    const compile = (filePath: string): string => {
        const normalizedPath = normalizeFilePath(filePath);
        const cached = transformedCache.get(normalizedPath);
        if (cached) return cached;

        const source = normalizedFiles[normalizedPath];
        if (source === undefined) {
            throw new Error(`Module source not found: ${normalizedPath}`);
        }

        const compiled = transform(source, {
            transforms: ['typescript', 'jsx', 'imports'],
            jsxRuntime: 'classic',
            jsxPragma: 'React.createElement',
            jsxFragmentPragma: 'React.Fragment',
        }).code;

        transformedCache.set(normalizedPath, compiled);
        return compiled;
    };

    const loadModule = (filePath: string): any => {
        const normalizedPath = normalizeFilePath(filePath);
        if (moduleCache.has(normalizedPath)) {
            return moduleCache.get(normalizedPath);
        }

        const exports: Record<string, any> = {};
        const moduleObj: { exports: any } = { exports };

        // Pre-cache for circular dependencies
        moduleCache.set(normalizedPath, moduleObj.exports);

        const requireForFile = (specifier: string) => requireFrom(normalizedPath, specifier);
        const compiled = compile(normalizedPath);
        const fn = new Function('exports', 'module', 'require', 'React', compiled);
        fn(exports, moduleObj, requireForFile, react);

        const finalExports = moduleObj.exports;
        moduleCache.set(normalizedPath, finalExports);
        return finalExports;
    };

    const requireFrom = (fromPath: string, specifier: string): any => {
        if (Object.prototype.hasOwnProperty.call(externals, specifier)) {
            return externals[specifier];
        }

        const resolved = resolveFilePath(specifier, fromPath, normalizedFiles);
        if (!resolved) {
            throw new Error(`Module not found: ${specifier} (from ${normalizeFilePath(fromPath)})`);
        }
        return loadModule(resolved);
    };

    return {
        requireFrom,
        requireFor: (fromPath: string) => (specifier: string) => requireFrom(fromPath, specifier),
        resolveImport: (fromPath: string, specifier: string) => resolveFilePath(specifier, fromPath, normalizedFiles),
    };
}
