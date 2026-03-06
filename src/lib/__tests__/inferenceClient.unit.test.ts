import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInferenceClient } from '../inferenceClient';

describe('inferenceClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('posts chat requests to the inference API with the stage session header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ success: true, data: { id: 'chat-1' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createInferenceClient('session-1');
    await client.chat({
      model: 'opencode/qwen3-coder',
      messages: [{ role: 'user', content: 'hello' }],
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/inference/chat');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['X-Stage-Session']).toBe('session-1');

    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('opencode/qwen3-coder');
  });

  it('maps usage filters to GET query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ success: true, data: { summary: {}, requests: [] } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createInferenceClient('session-2');
    await client.usage({
      provider: 'provider-1',
      since: '2026-03-01',
      until: '2026-03-02',
      limit: 5,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      '/api/v1/inference/usage?provider=provider-1&since=2026-03-01&until=2026-03-02&limit=5',
    );
    expect(init.method).toBe('GET');
  });

  it('throws the API error message on failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 403,
      json: async () => ({ success: false, error: { message: 'forbidden' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createInferenceClient('session-3');
    await expect(
      client.chat({
        model: 'opencode/qwen3-coder',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    ).rejects.toThrow('forbidden');
  });
});
