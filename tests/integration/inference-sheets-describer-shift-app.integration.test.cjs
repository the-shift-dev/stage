const { existsSync } = require('node:fs');
const path = require('node:path');
const { expect, test } = require('@playwright/test');
const { newStageSession, openStageSession, pushDirectory } = require('./helpers/stage.cjs');

const rootDir = path.resolve(__dirname, '../../..');
const defaultShiftAppsDir = '/Users/tombensim/code/shift-apps/inference-sheets-describer/src/stage';
const fallbackExampleDir = path.join(rootDir, 'stage-cli/examples/inference-sheets-describer-app');
const appDir =
    process.env.INFERENCE_SHEETS_APP_DIR ||
    (existsSync(defaultShiftAppsDir) ? defaultShiftAppsDir : fallbackExampleDir);
const providedSessionId = process.env.INFERENCE_SHEETS_SESSION_ID || '';
const skipPush = process.env.INFERENCE_SHEETS_SKIP_PUSH === '1';

test.describe('@integration inference sheets describer shift-app', () => {
    test.skip(!process.env.LIVE_INFERENCE_E2E, 'Set LIVE_INFERENCE_E2E=1 to run the live Stage inference canary');

    test.skip(!existsSync(appDir), `App directory not found for inference E2E: ${appDir}`);

    test('renders spreadsheet fixtures, enforces the cap, and returns cache hits on the second run', async ({
        page
    }) => {
        test.setTimeout(180_000);

        if (skipPush && !providedSessionId) {
            throw new Error('INFERENCE_SHEETS_SKIP_PUSH=1 requires INFERENCE_SHEETS_SESSION_ID');
        }

        const sessionId = providedSessionId || newStageSession();
        if (!skipPush) {
            pushDirectory(sessionId, appDir);
        }

        const app = await openStageSession(page, sessionId);

        await expect(app.locator('#app-title')).toContainText(/Sheets Describer|Describe up to ten spreadsheets/i, {
            timeout: 20_000
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
            'product-backlog',
            'event-leads'
        ];

        for (const id of extraSelections) {
            if ((await app.locator('#selected-count').textContent())?.trim() === '10') {
                break;
            }
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

        await expect(app.locator('#cache-count')).toHaveText('3');

        const descriptions = await app.locator('[data-summary-card] [data-role="description"]').allTextContents();
        expect(descriptions.every((value) => value.trim().length >= 16)).toBe(true);

        await app.locator('#describe-button').click();

        await expect
            .poll(async () => app.locator('[data-summary-status="cache"]').count(), { timeout: 20_000 })
            .toBe(3);

        await page.waitForTimeout(6000);
    });
});
