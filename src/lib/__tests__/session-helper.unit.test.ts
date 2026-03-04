import { describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    }),
  },
}));

import { getSessionId, requireSession } from '../session-helper';

function req({ header, query }: { header?: string | null; query?: string | null }) {
  return {
    headers: {
      get(name: string) {
        if (name.toLowerCase() === 'x-stage-session') return header ?? null;
        return null;
      },
    },
    nextUrl: {
      searchParams: {
        get(name: string) {
          if (name === 'session') return query ?? null;
          return null;
        },
      },
    },
  } as any;
}

describe('session-helper', () => {
  it('prefers x-stage-session header over query param', () => {
    const id = getSessionId(req({ header: 'header-id', query: 'query-id' }));
    expect(id).toBe('header-id');
  });

  it('falls back to query param when header is missing', () => {
    const id = getSessionId(req({ query: 'query-id' }));
    expect(id).toBe('query-id');
  });

  it('returns null when no session provided', () => {
    const id = getSessionId(req({}));
    expect(id).toBeNull();
  });

  it('requireSession returns id when present', () => {
    expect(requireSession(req({ header: 'abc' }))).toBe('abc');
  });

  it('requireSession returns 400 response when missing', () => {
    const result = requireSession(req({}));
    expect(typeof result).toBe('object');
    expect((result as any).status).toBe(400);
    expect((result as any).body.error).toContain('Session required');
  });
});
