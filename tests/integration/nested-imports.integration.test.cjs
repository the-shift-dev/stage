const { expect, test } = require('@playwright/test');
const { newStageSession, openStageSession, renderSession, writeRemote } = require('./helpers/stage.cjs');

async function renderAndAssert(page, session, expectedValue) {
    renderSession(session);
    const app = await openStageSession(page, session);
    await expect(app.locator('#value')).toHaveText(expectedValue, { timeout: 10_000 });
    await expect(page.locator('pre')).toHaveCount(0);
}

test.describe('@integration nested import resolution', () => {
    test.beforeAll(() => {
        if (!process.env.CONVEX_SELF_HOSTED_URL) {
            throw new Error('Set CONVEX_SELF_HOSTED_URL for integration tests');
        }
        if (!process.env.CONVEX_SELF_HOSTED_ADMIN_KEY) {
            throw new Error('Set CONVEX_SELF_HOSTED_ADMIN_KEY for integration tests');
        }
    });

    test('resolves nested ../ imports from hooks -> lib', async ({ page }) => {
        const session = newStageSession();

        writeRemote(session, '/app/lib/api.ts', `export const ping = 'pong';`);
        writeRemote(
            session,
            '/app/hooks/useAuth.ts',
            `import { ping } from '../lib/api.ts'; export default function useAuth(){ return ping; }`
        );
        writeRemote(
            session,
            '/app/App.tsx',
            `import React from 'react'; import useAuth from './hooks/useAuth.ts'; export default function App(){ return <div id=\"value\">{useAuth()}</div>; }`
        );

        await renderAndAssert(page, session, 'pong');
    });

    test('resolves extensionless transitive imports', async ({ page }) => {
        const session = newStageSession();

        writeRemote(session, '/app/lib/math.ts', `export const n = 42;`);
        writeRemote(session, '/app/hooks/useNum.ts', `import { n } from '../lib/math'; export default () => n;`);
        writeRemote(
            session,
            '/app/App.tsx',
            `import React from 'react'; import useNum from './hooks/useNum'; export default function App(){ return <div id=\"value\">{String(useNum())}</div>; }`
        );

        await renderAndAssert(page, session, '42');
    });

    test('resolves directory index import', async ({ page }) => {
        const session = newStageSession();

        writeRemote(session, '/app/pkg/index.ts', `export default 'index-ok';`);
        writeRemote(
            session,
            '/app/App.tsx',
            `import React from 'react'; import value from './pkg'; export default function App(){ return <div id=\"value\">{value}</div>; }`
        );

        await renderAndAssert(page, session, 'index-ok');
    });

    test('resolves absolute /app imports', async ({ page }) => {
        const session = newStageSession();

        writeRemote(session, '/app/lib/constants.ts', `export const name = 'abs';`);
        writeRemote(
            session,
            '/app/App.tsx',
            `import React from 'react'; import { name } from '/app/lib/constants.ts'; export default function App(){ return <div id=\"value\">{name}</div>; }`
        );

        await renderAndAssert(page, session, 'abs');
    });

    test('applies imported css from relative file', async ({ page }) => {
        const session = newStageSession();

        writeRemote(session, '/app/styles/palette.css', `#value { color: rgb(255, 0, 0); font-weight: 700; }`);
        writeRemote(
            session,
            '/app/App.tsx',
            `import React from 'react'; import './styles/palette.css'; export default function App(){ return <div id=\"value\">css-ok</div>; }`
        );

        renderSession(session);
        const app = await openStageSession(page, session);
        await expect(app.locator('#value')).toHaveText('css-ok', { timeout: 10_000 });

        const style = await app.locator('#value').evaluate((el) => {
            const cs = window.getComputedStyle(el);
            return { color: cs.color, fontWeight: cs.fontWeight };
        });

        expect(style).toEqual({ color: 'rgb(255, 0, 0)', fontWeight: '700' });
        await expect(page.locator('pre')).toHaveCount(0);
    });

    test('supports css modules class mapping', async ({ page }) => {
        const session = newStageSession();

        writeRemote(session, '/app/styles/palette.module.css', `.title { color: rgb(0, 128, 0); }`);
        writeRemote(
            session,
            '/app/App.tsx',
            `import React from 'react'; import styles from './styles/palette.module.css'; export default function App(){ return <div id=\"value\" className={styles.title}>css-module</div>; }`
        );

        renderSession(session);
        const app = await openStageSession(page, session);
        await expect(app.locator('#value')).toHaveText('css-module', { timeout: 10_000 });

        const color = await app.locator('#value').evaluate((el) => window.getComputedStyle(el).color);

        expect(color).toBe('rgb(0, 128, 0)');
        await expect(page.locator('pre')).toHaveCount(0);
    });

    test('supports @import and url() asset handling in css', async ({ page }) => {
        const session = newStageSession();

        writeRemote(
            session,
            '/app/styles/base.css',
            `#value { color: rgb(0, 0, 255); background-image: url('./icon.svg'); }`
        );
        writeRemote(session, '/app/styles/main.css', `@import './base.css';`);
        writeRemote(
            session,
            '/app/styles/icon.svg',
            `<svg xmlns='http://www.w3.org/2000/svg' width='4' height='4'><rect width='4' height='4' fill='red'/></svg>`
        );
        writeRemote(
            session,
            '/app/App.tsx',
            `import React from 'react'; import './styles/main.css'; export default function App(){ return <div id=\"value\">css-import-url</div>; }`
        );

        renderSession(session);
        const app = await openStageSession(page, session);
        await expect(app.locator('#value')).toHaveText('css-import-url', { timeout: 10_000 });

        const style = await app.locator('#value').evaluate((el) => {
            const cs = window.getComputedStyle(el);
            return { color: cs.color, bg: cs.backgroundImage };
        });

        expect(style?.color).toBe('rgb(0, 0, 255)');
        expect(style?.bg).toContain('data:image/svg+xml;base64,');
        await expect(page.locator('pre')).toHaveCount(0);
    });
});
