import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const stageUrl = process.env.STAGE_URL || 'http://127.0.0.1:3000';
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const stageCliEntry = path.join(rootDir, 'stage-cli/packages/cli/src/main.ts');
const exampleDir = path.join(rootDir, 'stage-cli/examples/inference-sheets-describer-app');

function runStage(args: string[]): string {
    return execFileSync('bun', [stageCliEntry, ...args], {
        cwd: rootDir,
        encoding: 'utf8',
        env: {
            ...process.env,
            STAGE_URL: stageUrl
        }
    }).trim();
}

function newSession(): string {
    const output = runStage(['new', '--json']);
    return JSON.parse(output).id as string;
}

function pushExample(sessionId: string): void {
    runStage(['push', exampleDir, '/app', '--session', sessionId]);
}

test.describe('@integration inference sheets describer', () => {
    test.skip(!process.env.LIVE_INFERENCE_E2E, 'Set LIVE_INFERENCE_E2E=1 to run the live Stage inference canary');

    test('renders fixture sheets, enforces the selection cap, and generates summaries', async ({ page }) => {
        const sessionId = newSession();
        pushExample(sessionId);

        await page.goto(`${stageUrl}/s/${sessionId}`, {
            waitUntil: 'domcontentloaded'
        });

        const app = page.frameLocator('iframe[data-stage-app]');
        await expect(app.locator('#app-title')).toHaveText('Sheets Describer', {
            timeout: 15_000
        });
        await expect(app.locator('[data-doc-id]')).toHaveCount(12);
        await expect(app.locator('#selected-count')).toHaveText('3');

        const extraSelections = [
            'weekly-standups',
            'hiring-funnel-engineering',
            'inventory-reorder-plan',
            'campaign-performance',
            'incident-timeline',
            'customer-health',
            'product-backlog'
        ];

        for (const id of extraSelections) {
            await app.locator(`[data-doc-id="${id}"]`).click();
        }

        await expect(app.locator('#selected-count')).toHaveText('10');
        await app.locator('[data-doc-id="budget-variance"]').click();
        await expect(app.locator('#selection-limit')).toContainText('Only 10 sheets can be described in one run.');
        await expect(app.locator('[data-doc-id="budget-variance"]')).toHaveAttribute('data-selected', 'false');

        await app.locator('#reset-selection-button').click();
        await expect(app.locator('#selected-count')).toHaveText('3');

        await app.locator('#describe-button').click();

        await expect
            .poll(
                async () =>
                    (await app.locator('[data-summary-status="live"]').count()) +
                    (await app.locator('[data-summary-status="cache"]').count()),
                { timeout: 120_000 }
            )
            .toBe(3);

        const descriptions = await app.locator('[data-summary-card] [data-role="description"]').allTextContents();

        expect(descriptions.every((value) => value.trim().length >= 16)).toBe(true);

        await app.locator('#describe-button').click();
        await expect
            .poll(async () => app.locator('[data-summary-status="cache"]').count(), { timeout: 20_000 })
            .toBe(3);
    });
});
