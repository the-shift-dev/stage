// Import the actual validator implementation
import { validateUserCode } from '../codeValidator.ts';

// Simple assertion function
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function assertContains(array, item, message) {
    if (!array.some((element) => element.includes(item))) {
        throw new Error(
            `Assertion failed: ${message}. Expected array to contain "${item}", got: ${JSON.stringify(array)}`
        );
    }
}

console.log('🧪 Testing Code Validator (using actual implementation)...\n');

let testsRun = 0;
let testsPassed = 0;

function runTest(testName, testFn) {
    testsRun++;
    try {
        console.log(`Test ${testsRun}: ${testName}`);
        testFn();
        testsPassed++;
        console.log('✅ PASSED');
        console.log('');
    } catch (error) {
        console.log('❌ FAILED');
        console.log('Error:', error.message);
        console.log('');
    }
}

// Test 1: Valid React + Recharts code
const validCode = `
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

runTest('Valid React + Recharts', () => {
    const result1 = validateUserCode(validCode);
    assert(result1.isValid === true, 'Valid React + Recharts code should be accepted');
    assert(result1.violations.length === 0, 'Valid code should have no violations');
});

// Test 2: Invalid - File system access
const invalidCode = `
import fs from 'fs';
import React from 'react';

export default function BadComponent() {
  const data = fs.readFileSync('/etc/passwd');
  return <div>{data}</div>;
}
`;

runTest('Invalid - File system access', () => {
    const result2 = validateUserCode(invalidCode);
    assert(result2.isValid === false, 'File system access should be rejected');
    assertContains(result2.violations, 'Unauthorized import: fs', 'Should detect unauthorized fs import');
});

// Test 3: Invalid - Eval call
const evalCode = `
import React from 'react';

export default function EvilComponent() {
  eval('alert("hacked")');
  return <div>Evil</div>;
}
`;

runTest('Invalid - Eval call', () => {
    const result3 = validateUserCode(evalCode);
    assert(result3.isValid === false, 'Eval calls should be rejected');
    assertContains(result3.violations, 'Dangerous function call: eval', 'Should detect eval call');
});

// Test 4: Invalid - Require call
const requireCode = `
import React from 'react';

export default function RequireComponent() {
  const fs = require('fs');
  return <div>Bad</div>;
}
`;

runTest('Invalid - Require call', () => {
    const result4 = validateUserCode(requireCode);
    assert(result4.isValid === false, 'Require calls should be rejected');
    assertContains(result4.violations, 'Dangerous function call: require', 'Should detect require call');
});

// Test 5: Invalid - Process access
const processCode = `
import React from 'react';

export default function ProcessComponent() {
  process.exit(1);
  return <div>Process</div>;
}
`;

runTest('Invalid - Process access', () => {
    const result5 = validateUserCode(processCode);
    assert(result5.isValid === false, 'Process access should be rejected');
    assertContains(result5.violations, 'Dangerous property access: process.exit', 'Should detect process.exit');
});

// Test 6: Invalid - Dynamic import
const dynamicCode = `
import React from 'react';

export default function DynamicComponent() {
  import('fs').then(fs => console.log(fs));
  return <div>Dynamic</div>;
}
`;

runTest('Invalid - Dynamic import', () => {
    const result6 = validateUserCode(dynamicCode);
    assert(result6.isValid === false, 'Dynamic imports should be rejected');
    assertContains(result6.violations, 'Dynamic imports not allowed', 'Should detect dynamic import');
});

// Test 7: Invalid - Suspicious string
const suspiciousCode = `
import React from 'react';

export default function SuspiciousComponent() {
  const malicious = "eval('alert(1)')";
  return <div>{malicious}</div>;
}
`;

runTest('Invalid - Suspicious string', () => {
    const result7 = validateUserCode(suspiciousCode);
    assert(result7.isValid === false, 'Suspicious strings should be rejected');
    assertContains(result7.violations, 'Suspicious string literal detected', 'Should detect suspicious string');
});

// Summary
console.log(`📊 Summary: ${testsPassed}/${testsRun} tests passed`);
if (testsPassed === testsRun) {
    console.log('🎉 All tests passed with proper assertions!');
    console.log('✅ Testing actual implementation from codeValidator.ts');
    process.exit(0);
} else {
    console.log('❌ Some tests failed');
    process.exit(1);
}
