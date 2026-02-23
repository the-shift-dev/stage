/**
 * Stage KV — localStorage-backed key-value store scoped per artifact.
 */

const PREFIX = 'stage:kv:';

function scopedKey(scope: string, key: string): string {
    return `${PREFIX}${scope}:${key}`;
}

function prefixFor(scope: string): string {
    return `${PREFIX}${scope}:`;
}

export interface StageKV {
    get: (key: string) => any | null;
    set: (key: string, value: any) => void;
    delete: (key: string) => void;
    list: () => string[];
    clear: () => void;
}

export function createKV(scope: string): StageKV {
    return {
        get(key: string): any | null {
            const raw = localStorage.getItem(scopedKey(scope, key));
            if (raw === null) return null;
            try {
                return JSON.parse(raw);
            } catch {
                return raw;
            }
        },

        set(key: string, value: any): void {
            localStorage.setItem(scopedKey(scope, key), JSON.stringify(value));
        },

        delete(key: string): void {
            localStorage.removeItem(scopedKey(scope, key));
        },

        list(): string[] {
            const prefix = prefixFor(scope);
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k?.startsWith(prefix)) {
                    keys.push(k.slice(prefix.length));
                }
            }
            return keys;
        },

        clear(): void {
            const prefix = prefixFor(scope);
            const toRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k?.startsWith(prefix)) {
                    toRemove.push(k);
                }
            }
            toRemove.forEach((k) => localStorage.removeItem(k));
        }
    };
}
