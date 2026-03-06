import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_INFERENCE_API_URL = 'http://127.0.0.1:4007';

function getInferenceBaseUrl(): string {
  return (
    process.env.INFERENCE_API_URL?.trim().replace(/\/+$/, '') ||
    DEFAULT_INFERENCE_API_URL
  );
}

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const targetUrl = new URL(
    `/api/v1/inference/${path.join('/')}`,
    `${getInferenceBaseUrl()}/`,
  );
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('content-type', contentType);
  }

  const stageSession = request.headers.get('x-stage-session');
  if (stageSession) {
    headers.set('x-stage-session', stageSession);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  try {
    const upstream = await fetch(targetUrl, init);
    const body = await upstream.text();

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'content-type':
          upstream.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPSTREAM_UNAVAILABLE',
          message:
            error instanceof Error ? error.message : 'Inference proxy failed',
        },
      },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxy(request, path);
}
