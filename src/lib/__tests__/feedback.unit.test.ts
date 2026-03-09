import { describe, expect, it } from 'vitest';
import { buildFeedbackAgentPrompt, resolveFeedbackTarget, resolveStageSessionChannel } from '../feedback';

describe('feedback helpers', () => {
    it('detects preview and production channels from channel bindings', () => {
        const app = {
            sid: 'app_123',
            previewVersionSid: 'sav_preview',
            productionVersionSid: 'sav_prod',
            resolvedVersionSid: 'sav_preview',
            channels: {
                preview: { sessionId: 'q_preview', appVersionSid: 'sav_preview' },
                production: { sessionId: 'q_prod', appVersionSid: 'sav_prod' }
            }
        };

        expect(resolveStageSessionChannel(app, 'q_preview')).toBe('preview');
        expect(resolveStageSessionChannel(app, 'q_prod')).toBe('production');
        expect(resolveStageSessionChannel(app, 'q_other')).toBeNull();
    });

    it('falls back to the resolved version when the session is not pinned to a named channel', () => {
        const app = {
            sid: 'app_123',
            previewVersionSid: 'sav_preview',
            resolvedVersionSid: 'sav_hist',
            channels: {
                preview: { sessionId: 'q_preview', appVersionSid: 'sav_preview' },
                production: null
            }
        };

        expect(resolveFeedbackTarget(app, 'q_preview')).toEqual({
            channel: 'preview',
            appVersionSid: 'sav_preview'
        });

        expect(resolveFeedbackTarget(app, 'q_history')).toEqual({
            channel: null,
            appVersionSid: 'sav_hist'
        });
    });

    it('builds a copyable prompt for non-Studio agent workflows', () => {
        const prompt = buildFeedbackAgentPrompt(
            {
                appName: 'ShiftCal',
                appSid: 'app_123',
                appVersionSid: 'sav_preview',
                sessionId: 'q_preview',
                channel: 'preview',
                stageUrl: 'https://example.com/s/q_preview?feedback=1',
                studioSessionSid: 'stu_123'
            },
            {
                comment: 'Move this CTA higher and simplify the copy.',
                authorEmail: 'tom@example.com',
                authorName: 'Tom',
                annotations: [
                    {
                        elementSelector: 'main > button:nth-of-type(1)',
                        elementTag: 'button',
                        elementText: 'Book a demo',
                        boundingBox: { x: 10, y: 20, width: 200, height: 40 }
                    }
                ]
            }
        );

        expect(prompt).toContain('Stage feedback for ShiftCal');
        expect(prompt).toContain('studio session sid: stu_123');
        expect(prompt).toContain('Move this CTA higher and simplify the copy.');
        expect(prompt).toContain('selector: main > button:nth-of-type(1)');
        expect(prompt).toContain('Please update the Stage app to address this feedback.');
    });
});
