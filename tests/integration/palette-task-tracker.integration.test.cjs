const { expect, test } = require('@playwright/test');
const { openStageSession } = require('./helpers/stage.cjs');

function seriousConsoleErrors(messages) {
    return messages.filter((message) => {
        const lower = message.toLowerCase();
        return !lower.includes('favicon')
            && !lower.includes('sourcemap')
            && !lower.includes('cross-origin-opener-policy header has been ignored')
            && lower !== 'failed to load resource: the server responded with a status of 401 (unauthorized)';
    });
}

test.describe('@integration palette task tracker stage app', () => {
    test('meets palette standards and supports the full task flow', async ({ page }) => {
        test.skip(!process.env.SHIFT_STAGE_SESSION_ID, 'Requires SHIFT_STAGE_SESSION_ID from platform-test stage-app');

        const paletteId = process.env.PALETTE_ID || 'unknown-palette';
        const consoleErrors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        const app = await openStageSession(page, process.env.SHIFT_STAGE_SESSION_ID, {
            delegatedAuth: false
        });

        await expect(app.locator('[data-testid="palette-task-tracker"]')).toBeVisible({ timeout: 15_000 });

        const vars = await app.locator('body').evaluate(() => {
            const styles = window.getComputedStyle(document.documentElement);
            return {
                background: styles.getPropertyValue('--background').trim(),
                foreground: styles.getPropertyValue('--foreground').trim(),
                primary: styles.getPropertyValue('--primary').trim(),
                card: styles.getPropertyValue('--card').trim(),
                chart2: styles.getPropertyValue('--chart-2').trim(),
                chart3: styles.getPropertyValue('--chart-3').trim(),
                destructive: styles.getPropertyValue('--destructive').trim(),
                radius: styles.getPropertyValue('--radius').trim()
            };
        });

        for (const [key, value] of Object.entries(vars)) {
            expect.soft(value, `${paletteId} should expose ${key}`).toBeTruthy();
        }

        const styleScan = await app.locator('body').evaluate(() => {
            const violations = [];
            const elements = document.querySelectorAll('[style]');
            elements.forEach((element) => {
                const style = element.getAttribute('style') || '';
                if (/#[0-9a-fA-F]{3,8}/.test(style) || /rgba?\(/i.test(style)) {
                    violations.push({
                        tag: element.tagName,
                        style
                    });
                }
            });
            return violations;
        });
        expect(styleScan).toEqual([]);

        const buttonClasses = await app.locator('button').evaluateAll((elements) =>
            elements.map((element) => ({
                text: (element.textContent || '').trim(),
                className: String(element.className || '')
            }))
        );
        expect(buttonClasses.length).toBeGreaterThan(0);
        expect(buttonClasses.every((entry) => entry.className.includes('key-btn'))).toBe(true);

        const textInputClasses = await app.locator('input[type="text"]').evaluateAll((elements) =>
            elements.map((element) => String(element.className || ''))
        );
        expect(textInputClasses.length).toBe(1);
        expect(textInputClasses.every((className) => className.includes('key-input'))).toBe(true);

        await expect(app.locator('.card').first()).toBeVisible();

        const titleInput = app.locator('input[placeholder="Add a task..."]');
        const prioritySelect = app.locator('select[name="priority"]');
        const addButton = app.locator('button[type="submit"]');

        await titleInput.fill('Review pull request');
        await prioritySelect.selectOption('high');
        await addButton.click();

        await titleInput.fill('Schedule design QA');
        await prioritySelect.selectOption('medium');
        await addButton.click();

        await titleInput.fill('Archive notes');
        await prioritySelect.selectOption('low');
        await addButton.click();

        const reviewRow = app.locator('[data-task-title="Review pull request"]');
        const designRow = app.locator('[data-task-title="Schedule design QA"]');
        const archiveRow = app.locator('[data-task-title="Archive notes"]');

        await expect(reviewRow).toBeVisible();
        await expect(designRow).toBeVisible();
        await expect(archiveRow).toBeVisible();

        const badgeColors = await app.locator('.priority-badge').evaluateAll((elements) =>
            elements.map((element) => window.getComputedStyle(element).color)
        );
        expect(new Set(badgeColors).size).toBeGreaterThan(1);

        await reviewRow.locator('[data-action="toggle"]').click();
        await expect(reviewRow).toHaveAttribute('data-completed', 'true');

        await app.locator('[data-filter="active"]').click();
        await expect(reviewRow).toHaveCount(0);
        await expect(designRow).toBeVisible();
        await expect(archiveRow).toBeVisible();

        await app.locator('[data-filter="completed"]').click();
        await expect(app.locator('[data-task-title="Review pull request"]')).toBeVisible();
        await expect(app.locator('[data-task-title="Schedule design QA"]')).toHaveCount(0);

        await app.locator('[data-filter="all"]').click();
        await expect(reviewRow).toBeVisible();
        await expect(designRow).toBeVisible();

        await archiveRow.locator('[data-action="delete"]').click();
        await expect(app.locator('[data-task-title="Archive notes"]')).toHaveCount(0);

        const beforeTheme = await app.locator('body').evaluate(() => {
            const docStyles = window.getComputedStyle(document.documentElement);
            const bodyStyles = window.getComputedStyle(document.body);
            return {
                background: bodyStyles.backgroundColor,
                backgroundVar: docStyles.getPropertyValue('--background').trim(),
                theme: document.documentElement.dataset.theme || 'light'
            };
        });

        await app.locator('[data-testid="theme-toggle"]').click();

        const afterTheme = await app.locator('body').evaluate(() => {
            const docStyles = window.getComputedStyle(document.documentElement);
            const bodyStyles = window.getComputedStyle(document.body);
            return {
                background: bodyStyles.backgroundColor,
                backgroundVar: docStyles.getPropertyValue('--background').trim(),
                theme: document.documentElement.dataset.theme || '',
                darkClass: document.documentElement.classList.contains('dark')
            };
        });

        expect(afterTheme.theme).toBe('dark');
        expect(afterTheme.darkClass).toBe(true);
        expect(afterTheme.backgroundVar).not.toBe(beforeTheme.backgroundVar);
        expect(afterTheme.background).not.toBe(beforeTheme.background);

        await app.locator('[data-testid="palette-task-tracker"]').screenshot({
            path: test.info().outputPath(`${paletteId}.png`)
        });

        expect(seriousConsoleErrors(consoleErrors)).toEqual([]);
    });
});
