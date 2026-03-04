import { describe, expect, it } from 'vitest';
import { cn } from '../utils';

describe('utils.cn', () => {
  it('merges class names and drops falsy values', () => {
    expect(cn('a', false && 'b', null, undefined, 'c')).toBe('a c');
  });

  it('tailwind-merge behavior keeps last conflicting class', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('supports object/array style clsx inputs', () => {
    expect(cn(['x', { y: true, z: false }], { w: 1 })).toBe('x y w');
  });
});
