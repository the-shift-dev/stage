const { expect, test } = require('@playwright/test');
const { openStageSession } = require('./helpers/stage.cjs');

test.describe('@integration palette oklch stage app', () => {
    test('resolves semantic Tailwind classes from full CSS color values', async ({ page }) => {
        test.skip(!process.env.SHIFT_STAGE_SESSION_ID, 'Requires SHIFT_STAGE_SESSION_ID from platform-test stage-app');

        const app = await openStageSession(page, process.env.SHIFT_STAGE_SESSION_ID, {
            delegatedAuth: false
        });

        await expect(app.locator('#card')).toBeVisible({ timeout: 15_000 });

        const styles = await app.locator('#card').evaluate((card) => {
            const shell = document.querySelector('#shell');
            const intro = document.querySelector('#intro');
            if (!(shell instanceof HTMLElement) || !(intro instanceof HTMLElement)) {
                throw new Error('Test fixture elements were not rendered');
            }

            const cardStyles = window.getComputedStyle(card);
            const shellStyles = window.getComputedStyle(shell);
            const introStyles = window.getComputedStyle(intro);

            return {
                cardBackground: cardStyles.backgroundColor,
                cardText: cardStyles.color,
                shellBackground: shellStyles.backgroundColor,
                shellText: shellStyles.color,
                introText: introStyles.color
            };
        });

        expect(styles.cardBackground).not.toBe('rgba(0, 0, 0, 0)');
        expect(styles.cardBackground).not.toBe(styles.shellBackground);
        expect(styles.cardText).not.toBe(styles.shellText);
        expect(styles.introText).not.toBe(styles.shellText);
        await expect(page.locator('pre')).toHaveCount(0);
    });
});
