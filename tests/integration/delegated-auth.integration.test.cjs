const { expect, test } = require('@playwright/test');
const {
    bootstrapDelegatedAuth,
    newStageSession,
    openStageSession,
    readShiftIdentity,
    renderSession,
    writeRemote
} = require('./helpers/stage.cjs');

test.describe('@integration delegated auth bootstrap', () => {
    test.skip(
        !process.env.LIVE_STAGE_AUTH_E2E,
        'Set LIVE_STAGE_AUTH_E2E=1 after `shift-cli login` to run the delegated auth canary'
    );

    test('bootstraps browser auth so a Stage app can read /api/v1/auth/me', async ({ page }) => {
        const identity = readShiftIdentity();
        test.skip(!identity.authenticated || !identity.email, 'Run `shift-cli login` before the delegated auth canary');

        const sessionId = newStageSession();
        writeRemote(
            sessionId,
            '/app/App.tsx',
            `import React from "react";

export default function App() {
  const [value, setValue] = React.useState("loading");

  React.useEffect(() => {
    let active = true;

    (async () => {
      const res = await fetch("/api/v1/auth/me", {
        credentials: "include",
      });
      if (!active) return;

      if (!res.ok) {
        setValue(\`unauthorized:\${res.status}\`);
        return;
      }

      const payload = await res.json();
      setValue(payload?.data?.email || "missing-email");
    })().catch((error) => {
      if (!active) return;
      setValue(error instanceof Error ? error.message : String(error));
    });

    return () => {
      active = false;
    };
  }, []);

  return <div id="auth-email">{value}</div>;
}
`
        );
        renderSession(sessionId);

        const app = await openStageSession(page, sessionId, {
            delegatedAuth: false
        });
        await expect(app.locator('#auth-email')).toHaveText('unauthorized:401', {
            timeout: 15_000
        });

        await bootstrapDelegatedAuth(page, sessionId);
        await expect(app.locator('#auth-email')).toHaveText(identity.email, {
            timeout: 15_000
        });
    });
});
