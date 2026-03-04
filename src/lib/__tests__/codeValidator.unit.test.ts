import { describe, it, expect } from 'vitest';
import { validateUserCode } from '../codeValidator';

describe('codeValidator', () => {
  it('accepts valid React + Recharts code', () => {
    const code = `
      import React from 'react';
      import { LineChart, Line, XAxis, YAxis } from 'recharts';
      export default function Chart() {
        return (
          <LineChart width={400} height={300} data={[]}>
            <XAxis />
            <YAxis />
            <Line type="monotone" dataKey="value" stroke="#8884d8" />
          </LineChart>
        );
      }
    `;

    const result = validateUserCode(code);
    expect(result.isValid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('blocks unauthorized imports', () => {
    const code = `import fs from 'fs'; export default function App(){ return <div/> }`;
    const result = validateUserCode(code);

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.includes('Unauthorized import: fs'))).toBe(true);
  });

  it('blocks eval', () => {
    const code = `import React from 'react'; export default function App(){ eval('1+1'); return <div/> }`;
    const result = validateUserCode(code);

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.includes('Dangerous function call: eval'))).toBe(true);
  });

  it('blocks require', () => {
    const code = `import React from 'react'; export default function App(){ require('fs'); return <div/> }`;
    const result = validateUserCode(code);

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.includes('Dangerous function call: require'))).toBe(true);
  });

  it('blocks process.exit access', () => {
    const code = `import React from 'react'; export default function App(){ process.exit(1); return <div/> }`;
    const result = validateUserCode(code);

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.includes('Dangerous property access: process.exit'))).toBe(true);
  });

  it('blocks dynamic import', () => {
    const code = `import React from 'react'; export default function App(){ import('fs'); return <div/> }`;
    const result = validateUserCode(code);

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.includes('Dynamic imports not allowed'))).toBe(true);
  });

  it('blocks suspicious strings', () => {
    const code = `import React from 'react'; export default function App(){ const s = "eval('x')"; return <div>{s}</div> }`;
    const result = validateUserCode(code);

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.includes('Suspicious string literal detected'))).toBe(true);
  });

  it('blocks suspicious template literals', () => {
    const code = "import React from 'react'; export default function App(){ const s = `before require(\\\"fs\\\") after`; return <div>{s}</div> }";
    const result = validateUserCode(code);

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.includes('Suspicious template literal detected'))).toBe(true);
  });

  it('reports parser errors for invalid syntax', () => {
    const result = validateUserCode(`import React from 'react'; export default () => <div>`);
    expect(result.isValid).toBe(false);
    expect(result.violations[0]).toContain('Code parsing failed:');
  });

  it('deduplicates repeated violations', () => {
    const code = `import React from 'react'; export default function App(){ eval('1'); eval('2'); return <div/> }`;
    const result = validateUserCode(code);
    const evalViolations = result.violations.filter((v) => v.includes('Dangerous function call: eval'));

    expect(evalViolations).toHaveLength(1);
  });

  it('blocks dangerous member access on global objects', () => {
    const code = `import React from 'react'; export default function App(){ globalThis.require('x'); return <div/> }`;
    const result = validateUserCode(code);

    expect(result.isValid).toBe(false);
    expect(result.violations.some((v) => v.includes('Dangerous property access: globalThis.require'))).toBe(true);
  });
});
