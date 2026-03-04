import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.unit.test.ts', 'tests/**/*.unit.test.ts'],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage/unit',
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/**/*.test.*',
        'src/**/*.unit.test.*',
        'src/lib/runtime.ts',
        'src/lib/server-runtime.ts',
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        branches: 80,
        functions: 90,
      },
    },
  },
});
