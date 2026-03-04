import { beforeEach, describe, expect, it } from 'vitest';
import { createKV } from '../kv';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

describe('kv', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
  });

  it('sets and gets JSON values', () => {
    const kv = createKV('scope1');
    kv.set('a', { n: 1, ok: true });
    expect(kv.get('a')).toEqual({ n: 1, ok: true });
  });

  it('returns null for missing keys', () => {
    const kv = createKV('scope1');
    expect(kv.get('missing')).toBeNull();
  });

  it('returns raw value when stored payload is non-json', () => {
    localStorage.setItem('stage:kv:scope1:raw', 'not-json');
    const kv = createKV('scope1');
    expect(kv.get('raw')).toBe('not-json');
  });

  it('delete removes single key', () => {
    const kv = createKV('scope1');
    kv.set('a', 1);
    kv.set('b', 2);
    kv.delete('a');

    expect(kv.get('a')).toBeNull();
    expect(kv.get('b')).toBe(2);
  });

  it('list returns only keys in scope', () => {
    const a = createKV('scopeA');
    const b = createKV('scopeB');

    a.set('one', 1);
    a.set('two', 2);
    b.set('other', 3);

    expect(new Set(a.list())).toEqual(new Set(['one', 'two']));
    expect(b.list()).toEqual(['other']);
  });

  it('clear removes only scoped keys', () => {
    const a = createKV('scopeA');
    const b = createKV('scopeB');

    a.set('one', 1);
    a.set('two', 2);
    b.set('other', 3);

    a.clear();

    expect(a.list()).toEqual([]);
    expect(b.get('other')).toBe(3);
  });
});
