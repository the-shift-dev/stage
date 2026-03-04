import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createVirtualModuleSystem } from '../moduleResolver';

const fakeReact = { createElement: () => null, Fragment: Symbol('Fragment') };
const runtimeGlobals = {
  globalThis,
  window: undefined,
  document: undefined,
  navigator: undefined,
  fetch: undefined,
  XMLHttpRequest: undefined,
};

function makeMS(args: Omit<Parameters<typeof createVirtualModuleSystem>[0], 'runtimeGlobals'>) {
  return createVirtualModuleSystem({ ...args, runtimeGlobals });
}

describe('moduleResolver', () => {
  beforeEach(() => {
    // @ts-expect-error test-only global
    globalThis.__stageCounterCalls = 0;
  });

  it('resolves same-directory relative import with extension', () => {
    const ms = makeMS({
      files: {
        '/app/App.tsx': `import { value } from './dep.ts'; export default value;`,
        '/app/dep.ts': `export const value = 'ok';`,
      },
      externals: {},
      react: fakeReact,
    });

    const mod = ms.requireFrom('/app/bootstrap.ts', '/app/App.tsx');
    expect(mod.default).toBe('ok');
  });

  it('resolves nested ../ imports from subdirectories', () => {
    const ms = makeMS({
      files: {
        '/app/App.tsx': `import useAuth from './hooks/useAuth.ts'; export default useAuth();`,
        '/app/hooks/useAuth.ts': `import { ping } from '../lib/api.ts'; export default function useAuth(){ return ping; }`,
        '/app/lib/api.ts': `export const ping = 'pong';`,
      },
      externals: {},
      react: fakeReact,
    });

    const mod = ms.requireFrom('/app/bootstrap.ts', '/app/App.tsx');
    expect(mod.default).toBe('pong');
  });

  it('resolves extensionless imports', () => {
    const ms = makeMS({
      files: {
        '/app/App.tsx': `import { answer } from './utils/math'; export default answer;`,
        '/app/utils/math.ts': `export const answer = 42;`,
      },
      externals: {},
      react: fakeReact,
    });

    const mod = ms.requireFrom('/app/bootstrap.ts', '/app/App.tsx');
    expect(mod.default).toBe(42);
  });

  it('resolves directory index imports', () => {
    const ms = makeMS({
      files: {
        '/app/App.tsx': `import value from './pkg'; export default value;`,
        '/app/pkg/index.ts': `export default 'index-ok';`,
      },
      externals: {},
      react: fakeReact,
    });

    const mod = ms.requireFrom('/app/bootstrap.ts', '/app/App.tsx');
    expect(mod.default).toBe('index-ok');
  });

  it('supports absolute /app imports', () => {
    const ms = makeMS({
      files: {
        '/app/App.tsx': `import { n } from '/app/lib/numbers.ts'; export default n;`,
        '/app/lib/numbers.ts': `export const n = 7;`,
      },
      externals: {},
      react: fakeReact,
    });

    const mod = ms.requireFrom('/app/bootstrap.ts', '/app/App.tsx');
    expect(mod.default).toBe(7);
  });

  it('delegates bare imports to externals', () => {
    const ms = makeMS({
      files: {
        '/app/App.tsx': `import ext from 'my-ext'; export default ext.token;`,
      },
      externals: {
        'my-ext': { token: 'external' },
      },
      react: fakeReact,
    });

    const mod = ms.requireFrom('/app/bootstrap.ts', '/app/App.tsx');
    expect(mod.default).toBe('external');
  });

  it('caches module execution', () => {
    const ms = makeMS({
      files: {
        '/app/App.tsx': `
          import { calls } from './counter.ts';
          import { calls as callsAgain } from './counter.ts';
          export default calls + ':' + callsAgain;
        `,
        '/app/counter.ts': `
          let g = globalThis.__stageCounterCalls || 0;
          g += 1;
          globalThis.__stageCounterCalls = g;
          export const calls = g;
        `,
      },
      externals: {},
      react: fakeReact,
    });

    const mod = ms.requireFrom('/app/bootstrap.ts', '/app/App.tsx');
    expect(mod.default).toBe('1:1');
  });

  it('supports transitive dependency chains', () => {
    const ms = makeMS({
      files: {
        '/app/App.tsx': `import { a } from './a.ts'; export default a;`,
        '/app/a.ts': `import { b } from './b.ts'; export const a = 'A' + b;`,
        '/app/b.ts': `import { c } from './c.ts'; export const b = 'B' + c;`,
        '/app/c.ts': `export const c = 'C';`,
      },
      externals: {},
      react: fakeReact,
    });

    const mod = ms.requireFrom('/app/bootstrap.ts', '/app/App.tsx');
    expect(mod.default).toBe('ABC');
  });

  it('throws clear error on missing module', () => {
    const ms = makeMS({
      files: {
        '/app/App.tsx': `import missing from './missing'; export default missing;`,
      },
      externals: {},
      react: fakeReact,
    });

    expect(() => ms.requireFrom('/app/bootstrap.ts', '/app/App.tsx')).toThrowError(
      /Module not found: \.\/missing \(from \/app\/App\.tsx\)/,
    );
  });

  it('resolveImport returns normalized absolute path', () => {
    const ms = makeMS({
      files: {
        '/app/App.tsx': 'export default 1;',
        '/app/hooks/useAuth.ts': 'export default 1;',
      },
      externals: {},
      react: fakeReact,
    });

    expect(ms.resolveImport('/app/App.tsx', './hooks/useAuth')).toBe('/app/hooks/useAuth.ts');
  });

  it('resolveImport returns null for bare imports', () => {
    const ms = makeMS({
      files: { '/app/App.tsx': 'export default 1;' },
      externals: {},
      react: fakeReact,
    });

    expect(ms.resolveImport('/app/App.tsx', 'lodash')).toBeNull();
  });

  it('throws when resolved path exists syntactically but has no source entry', () => {
    const ms = makeMS({
      files: { '/app/App.tsx': 'export default 1;' },
      externals: {},
      react: fakeReact,
    });

    expect(() => ms.requireFrom('/app/App.tsx', '/app/missing.ts')).toThrow('Module not found: /app/missing.ts');
  });

  it('requireFor binds caller path', () => {
    const ms = makeMS({
      files: {
        '/app/hooks/useAuth.ts': `import { ping } from '../lib/api.ts'; export default ping;`,
        '/app/lib/api.ts': `export const ping = 'bound';`,
      },
      externals: {},
      react: fakeReact,
    });

    const req = ms.requireFor('/app/hooks/useAuth.ts');
    const mod = req('../lib/api.ts');
    expect(mod.ping).toBe('bound');
  });

  it('returns cached module on repeated top-level requires', () => {
    const ms = makeMS({
      files: {
        '/app/App.tsx': `
          globalThis.__moduleRepeat = (globalThis.__moduleRepeat || 0) + 1;
          export default globalThis.__moduleRepeat;
        `,
      },
      externals: {},
      react: fakeReact,
    });

    const first = ms.requireFrom('/app/bootstrap.ts', '/app/App.tsx');
    const second = ms.requireFrom('/app/bootstrap.ts', '/app/App.tsx');
    expect(first.default).toBe(1);
    expect(second.default).toBe(1);
  });

  it('resolves css imports and triggers onCssImport callback once', () => {
    const onCssImport = vi.fn();
    const ms = makeMS({
      files: {
        '/app/styles/palette.css': `.title { color: red; }`,
        '/app/App.tsx': `import './styles/palette.css'; export default 1;`,
      },
      externals: {},
      react: fakeReact,
      onCssImport,
    });

    const mod = ms.requireFrom('/app/bootstrap.ts', '/app/App.tsx');
    expect(mod.default).toBe(1);
    expect(onCssImport).toHaveBeenCalledTimes(1);
    expect(onCssImport).toHaveBeenCalledWith({
      filePath: '/app/styles/palette.css',
      cssContent: `.title { color: red; }`,
      files: expect.objectContaining({ '/app/styles/palette.css': `.title { color: red; }` }),
    });

    // cached module path should not trigger second callback
    ms.requireFrom('/app/bootstrap.ts', '/app/App.tsx');
    expect(onCssImport).toHaveBeenCalledTimes(1);
  });

  it('supports extensionless css imports', () => {
    const onCssImport = vi.fn();
    const ms = makeMS({
      files: {
        '/app/styles/theme.css': `#value { color: rgb(255, 0, 0); }`,
        '/app/App.tsx': `import './styles/theme'; export default 1;`,
      },
      externals: {},
      react: fakeReact,
      onCssImport,
    });

    ms.requireFrom('/app/bootstrap.ts', '/app/App.tsx');
    expect(onCssImport).toHaveBeenCalledWith({
      filePath: '/app/styles/theme.css',
      cssContent: `#value { color: rgb(255, 0, 0); }`,
      files: expect.objectContaining({ '/app/styles/theme.css': `#value { color: rgb(255, 0, 0); }` }),
    });
  });

  it('uses css module exports returned by css import callback', () => {
    const ms = makeMS({
      files: {
        '/app/styles/theme.module.css': `.title { color: red; }`,
        '/app/App.tsx': `import styles from './styles/theme.module.css'; export default styles.title;`,
      },
      externals: {},
      react: fakeReact,
      onCssImport: () => ({ title: 'title_hash' }),
    });

    const mod = ms.requireFrom('/app/bootstrap.ts', '/app/App.tsx');
    expect(mod.default).toBe('title_hash');
  });
});
