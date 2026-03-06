import { describe, it, expect } from 'vitest';
import { ALLOWED_IMPORT_PATHS, ALLOWED_IMPORTS_SET, UI_COMPONENT_PATHS, isImportAllowed } from '../allowedImports';

describe('allowedImports', () => {
  it('contains expected core imports', () => {
    expect(ALLOWED_IMPORT_PATHS).toContain('react');
    expect(ALLOWED_IMPORT_PATHS).toContain('@stage/convex');
    expect(ALLOWED_IMPORT_PATHS).toContain('@stage/google');
    expect(ALLOWED_IMPORT_PATHS).toContain('@stage/inference');
  });

  it('keeps set in sync with path list', () => {
    expect(ALLOWED_IMPORTS_SET.size).toBe(ALLOWED_IMPORT_PATHS.length);
    for (const path of ALLOWED_IMPORT_PATHS) {
      expect(ALLOWED_IMPORTS_SET.has(path)).toBe(true);
    }
  });

  it('allows relative imports', () => {
    expect(isImportAllowed('./Button')).toBe(true);
    expect(isImportAllowed('../lib/api')).toBe(true);
  });

  it('allows /app absolute imports', () => {
    expect(isImportAllowed('/app/Button.tsx')).toBe(true);
    expect(isImportAllowed('/app/components/Chart')).toBe(true);
  });

  it('allows configured bare imports and rejects unknown ones', () => {
    expect(isImportAllowed('lodash')).toBe(true);
    expect(isImportAllowed('fs')).toBe(false);
    expect(isImportAllowed('not-a-real-package')).toBe(false);
  });

  it('exports only UI component paths in UI_COMPONENT_PATHS', () => {
    expect(UI_COMPONENT_PATHS.length).toBeGreaterThan(20);
    expect(UI_COMPONENT_PATHS.every((p) => p.startsWith('@/components/ui/'))).toBe(true);
  });
});
