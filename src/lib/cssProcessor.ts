import postcss from 'postcss';
import autoprefixer from 'autoprefixer';

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

function resolveCssPath(specifier: string, fromPath: string, files: Record<string, string>): string | null {
    if (specifier.startsWith('http://') || specifier.startsWith('https://') || specifier.startsWith('data:')) {
        return null;
    }

    const fromDir = dirnamePosix(normalizeFilePath(fromPath));
    const base = resolvePosix(fromDir, specifier);
    const candidates = [base, `${base}.css`, `${base}/index.css`].map(normalizeFilePath);

    for (const candidate of candidates) {
        if (Object.prototype.hasOwnProperty.call(files, candidate)) {
            return candidate;
        }
    }

    return null;
}

function resolveAssetPath(specifier: string, fromPath: string, files: Record<string, string>): string | null {
    if (
        specifier.startsWith('http://') ||
        specifier.startsWith('https://') ||
        specifier.startsWith('data:') ||
        specifier.startsWith('blob:') ||
        specifier.startsWith('#')
    ) {
        return null;
    }

    const fromDir = dirnamePosix(normalizeFilePath(fromPath));
    const resolved = normalizeFilePath(resolvePosix(fromDir, specifier));
    return Object.prototype.hasOwnProperty.call(files, resolved) ? resolved : null;
}

const MIME_BY_EXT: Record<string, string> = {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
};

function mimeFromPath(filePath: string): string {
    const idx = filePath.lastIndexOf('.');
    const ext = idx >= 0 ? filePath.slice(idx).toLowerCase() : '';
    return MIME_BY_EXT[ext] || 'application/octet-stream';
}

function base64Encode(content: string): string {
    // Browser-safe UTF-8 base64
    const bytes = new TextEncoder().encode(content);
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(bytes).toString('base64');
    }
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hashShort(input: string): string {
    let h = 5381;
    for (let i = 0; i < input.length; i++) {
        h = (h * 33) ^ input.charCodeAt(i);
    }
    return (h >>> 0).toString(36).slice(0, 6);
}

function applyCssModules(css: string, filePath: string): { css: string; exports: Record<string, string> } {
    const classNames = new Set<string>();
    const classRegex = /\.([_a-zA-Z]+[\w-]*)/g;
    let m: RegExpExecArray | null;

    while ((m = classRegex.exec(css)) !== null) {
        classNames.add(m[1]);
    }

    const mapping: Record<string, string> = {};
    let transformed = css;
    for (const className of classNames) {
        const scoped = `${className}__${hashShort(`${filePath}:${className}`)}`;
        mapping[className] = scoped;
        transformed = transformed.replace(
            new RegExp(`\\.${escapeRegExp(className)}(?![\\w-])`, 'g'),
            `.${scoped}`,
        );
    }

    return { css: transformed, exports: mapping };
}

function runPostCssTransforms(css: string): string {
    return postcss([autoprefixer]).process(css, { from: undefined }).css;
}

function processCssFile(
    filePath: string,
    files: Record<string, string>,
    stack: Set<string>,
): { css: string; exports: Record<string, string> } {
    const normalizedPath = normalizeFilePath(filePath);
    const source = files[normalizedPath];
    if (source === undefined) {
        throw new Error(`CSS file not found: ${normalizedPath}`);
    }

    if (stack.has(normalizedPath)) {
        return { css: '', exports: {} };
    }

    stack.add(normalizedPath);

    let css = source.replace(/@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;?/g, (_all, specifier: string) => {
        const resolved = resolveCssPath(specifier, normalizedPath, files);
        if (!resolved) {
            // Keep external imports intact
            if (specifier.startsWith('http://') || specifier.startsWith('https://') || specifier.startsWith('data:')) {
                return `@import url('${specifier}');`;
            }
            throw new Error(`CSS @import not found: ${specifier} (from ${normalizedPath})`);
        }
        return processCssFile(resolved, files, stack).css;
    });

    css = css.replace(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/g, (_all, _quote, rawPath: string) => {
        const resolved = resolveAssetPath(rawPath.trim(), normalizedPath, files);
        if (!resolved) {
            return `url(${rawPath})`;
        }

        const assetContent = files[resolved] as string;
        const mime = mimeFromPath(resolved);
        const b64 = base64Encode(assetContent);
        return `url("data:${mime};base64,${b64}")`;
    });

    let exports: Record<string, string> = {};
    if (normalizedPath.endsWith('.module.css')) {
        const mod = applyCssModules(css, normalizedPath);
        css = mod.css;
        exports = mod.exports;
    }

    css = runPostCssTransforms(css);

    stack.delete(normalizedPath);
    return { css, exports };
}

export function processCssImport({
    filePath,
    files,
}: {
    filePath: string;
    files: Record<string, string>;
}): { css: string; exports: Record<string, string> } {
    return processCssFile(normalizeFilePath(filePath), files, new Set());
}
