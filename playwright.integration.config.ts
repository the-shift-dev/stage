import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/integration',
    testMatch: '**/*.integration.test.cjs',
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    timeout: 60_000,
    use: {
        headless: true
    }
});
