const path = require('node:path');
const { expect, test } = require('@playwright/test');
const { newStageSession, openStageSession, pushDirectory } = require('./helpers/stage.cjs');

const rootDir = path.resolve(__dirname, '../../..');
const exampleDir = path.join(rootDir, 'stage-cli/examples/inference-sheets-describer-app');

test.describe('@integration inference sheets describer', () => {
    test.skip(!process.env.LIVE_INFERENCE_E2E, 'Set LIVE_INFERENCE_E2E=1 to run the live Stage inference canary');

    test('renders fixture sheets, enforces the selection cap, and generates summaries', async ({ page }) => {
        const sessionId = newStageSession();
        pushDirectory(sessionId, exampleDir);

        const app = await openStageSession(page, sessionId);
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

        const descriptions = await app.locator('[data-summary-card] [data-role="description"]').allTextContents();

        expect(descriptions.every((value) => value.trim().length >= 16)).toBe(true);

        await app.locator('#describe-button').click();
        await expect
            .poll(async () => app.locator('[data-summary-status="cache"]').count(), { timeout: 20_000 })
            .toBe(3);

        await page.waitForTimeout(6000);
    });
});
