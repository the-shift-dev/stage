import { describe, expect, it } from 'vitest';
import { processCssImport } from '../cssProcessor';

describe('cssProcessor', () => {
  it('returns global css unchanged (except postcss transforms)', () => {
    const result = processCssImport({
      filePath: '/app/styles/base.css',
      files: {
        '/app/styles/base.css': `.title { color: red; }`,
      },
    });

    expect(result.css).toContain('.title');
    expect(result.css).toContain('color: red');
    expect(result.exports).toEqual({});
  });

  it('throws when entry css file is missing', () => {
    expect(() => processCssImport({ filePath: '/app/styles/missing.css', files: {} })).toThrow(
      /CSS file not found/,
    );
  });

  it('resolves @import recursively', () => {
    const result = processCssImport({
      filePath: '/app/styles/main.css',
      files: {
        '/app/styles/main.css': `@import './a.css'; .main { color: black; }`,
        '/app/styles/a.css': `@import './b.css'; .a { color: red; }`,
        '/app/styles/b.css': `.b { color: blue; }`,
      },
    });

    expect(result.css).toContain('.b');
    expect(result.css).toContain('.a');
    expect(result.css).toContain('.main');
  });

  it('supports extensionless @import', () => {
    const result = processCssImport({
      filePath: '/app/styles/main.css',
      files: {
        '/app/styles/main.css': `@import './a'; .main { color: black; }`,
        '/app/styles/a.css': `.a { color: red; }`,
      },
    });

    expect(result.css).toContain('.a');
    expect(result.css).toContain('.main');
  });

  it('resolves parent-directory @import paths', () => {
    const result = processCssImport({
      filePath: '/app/styles/nested/main.css',
      files: {
        '/app/styles/nested/main.css': `@import '../base.css'; .nested { color: black; }`,
        '/app/styles/base.css': `.base { color: red; }`,
      },
    });

    expect(result.css).toContain('.base');
    expect(result.css).toContain('.nested');
  });

  it('keeps external @import untouched', () => {
    const result = processCssImport({
      filePath: '/app/styles/main.css',
      files: {
        '/app/styles/main.css': `@import url('https://example.com/x.css'); .main { color: black; }`,
      },
    });

    expect(result.css).toContain('@import url(https://example.com/x.css);');
  });

  it('throws on missing local @import', () => {
    expect(() =>
      processCssImport({
        filePath: '/app/styles/main.css',
        files: {
          '/app/styles/main.css': `@import './missing.css';`,
        },
      }),
    ).toThrow(/CSS @import not found/);
  });

  it('inlines url() asset references as data URLs', () => {
    const result = processCssImport({
      filePath: '/app/styles/main.css',
      files: {
        '/app/styles/main.css': `.icon { background-image: url('./icon.svg'); }`,
        '/app/styles/icon.svg': `<svg xmlns='http://www.w3.org/2000/svg'></svg>`,
      },
    });

    expect(result.css).toContain('data:image/svg+xml;base64,');
  });

  it('maps common mime types for assets in url()', () => {
    const result = processCssImport({
      filePath: '/app/styles/main.css',
      files: {
        '/app/styles/main.css': `.icon { background-image: url('./icon.png'); }`,
        '/app/styles/icon.png': 'fake-png-bytes',
      },
    });

    expect(result.css).toContain('data:image/png;base64,');
  });

  it('keeps unresolved external-like urls unchanged', () => {
    const result = processCssImport({
      filePath: '/app/styles/main.css',
      files: {
        '/app/styles/main.css': `.hero { background: url('https://example.com/bg.png'); }`,
      },
    });

    expect(result.css).toContain("url(https://example.com/bg.png)");
  });

  it('supports css modules and returns exports mapping', () => {
    const result = processCssImport({
      filePath: '/app/styles/palette.module.css',
      files: {
        '/app/styles/palette.module.css': `.title { color: red; } .button-primary { display: block; }`,
      },
    });

    expect(result.exports.title).toMatch(/^title__/);
    expect(result.exports['button-primary']).toMatch(/^button-primary__/);
    expect(result.css).toContain(`.${result.exports.title}`);
    expect(result.css).toContain(`.${result.exports['button-primary']}`);
  });

  it('handles circular @import without infinite recursion', () => {
    const result = processCssImport({
      filePath: '/app/styles/a.css',
      files: {
        '/app/styles/a.css': `@import './b.css'; .a { color: red; }`,
        '/app/styles/b.css': `@import './a.css'; .b { color: blue; }`,
      },
    });

    expect(result.css).toContain('.a');
    expect(result.css).toContain('.b');
  });
});
