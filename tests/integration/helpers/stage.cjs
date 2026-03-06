const { execFileSync } = require('node:child_process');
const { mkdtempSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '../../../..');

const stageUrl = process.env.STAGE_URL || process.env.GATEWAY_URL || 'http://shift.lvh.me';

function shiftEnv(extra = {}) {
    return {
        ...process.env,
        FORCE_COLOR: '0',
        SHIFT_STORAGE: process.env.SHIFT_STORAGE || 'gateway',
        GATEWAY_URL: process.env.GATEWAY_URL || stageUrl,
        STAGE_URL: stageUrl,
        ...extra
    };
}

function runShift(args) {
    return execFileSync(process.env.SHIFT_CLI_BIN || 'shift-cli', args, {
        cwd: rootDir,
        encoding: 'utf8',
        env: shiftEnv()
    }).trim();
}

function runShiftJson(args) {
    return JSON.parse(runShift([...args, '--json']));
}

function readShiftIdentity() {
    return runShiftJson(['whoami']);
}

function usesDelegatedAuth() {
    return process.env.SHIFT_E2E_AUTH === 'delegated';
}

function requireDelegatedAuth() {
    const identity = readShiftIdentity();
    if (!identity.authenticated) {
        throw new Error('Delegated E2E requires an authenticated Shift CLI session. Run `shift-cli login` first.');
    }
    return identity;
}

function newStageSession(args = {}) {
    const commandArgs = ['stage', 'new'];
    if (args.name) commandArgs.push('--name', args.name);
    if (args.description) commandArgs.push('--description', args.description);
    if (args.tags?.length) commandArgs.push('--tags', args.tags.join(','));
    return runShiftJson(commandArgs).id;
}

function setStageGoogleScopes(sessionId, scopes) {
    const commandArgs = ['stage', 'scopes:set', '-s', sessionId];
    for (const scope of scopes) {
        commandArgs.push('--scope', scope);
    }
    runShiftJson(commandArgs);
}

function pushDirectory(sessionId, localDir, remoteDir = '/app', entry) {
    const commandArgs = ['stage', 'push', localDir, remoteDir, '-s', sessionId];
    if (entry) commandArgs.push('--entry', entry);
    runShiftJson(commandArgs);
}

function renderSession(sessionId, entry = '/app/App.tsx') {
    runShiftJson(['stage', 'render', entry, '-s', sessionId]);
}

function writeRemote(sessionId, remotePath, content) {
    const dir = mkdtempSync(path.join(tmpdir(), 'stage-it-'));
    const localPath = path.join(dir, path.basename(remotePath).replace(/\//g, '_') || 'tmp.ts');
    writeFileSync(localPath, content, 'utf8');
    runShiftJson(['stage', 'write', remotePath, localPath, '-s', sessionId]);
}

async function bootstrapDelegatedAuth(page, sessionId, redirectPath = `/s/${sessionId}`) {
    requireDelegatedAuth();
    const artifact = runShiftJson(['test', 'bootstrap', '--session', sessionId, '--redirect', redirectPath]);
    await page.goto(artifact.bootstrapUrl, {
        waitUntil: 'domcontentloaded'
    });
}

function stageAppFrame(page) {
    return page.frameLocator('iframe[data-stage-app]');
}

async function openStageSession(page, sessionId, opts = {}) {
    const delegatedAuth = opts.delegatedAuth ?? usesDelegatedAuth();
    if (delegatedAuth) {
        await bootstrapDelegatedAuth(page, sessionId);
    }
    await page.goto(`${stageUrl}/s/${sessionId}`, {
        waitUntil: 'domcontentloaded'
    });
    const frame = page.locator('iframe[data-stage-app]');
    await frame
        .first()
        .waitFor({
            state: 'attached',
            timeout: 2000
        })
        .catch(() => null);
    return (await frame.count()) > 0 ? stageAppFrame(page) : page;
}

module.exports = {
    bootstrapDelegatedAuth,
    newStageSession,
    openStageSession,
    pushDirectory,
    readShiftIdentity,
    renderSession,
    runShift,
    runShiftJson,
    setStageGoogleScopes,
    stageAppFrame,
    stageUrl,
    usesDelegatedAuth,
    writeRemote
};
