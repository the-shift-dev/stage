type ConvexResponse = {
  status: 'success' | 'error';
  value?: any;
  errorMessage?: string;
};

function getConvexConfig() {
  const cloudUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  const selfHostedUrl = process.env.CONVEX_SELF_HOSTED_URL;

  if (cloudUrl && !selfHostedUrl) {
    return {
      url: cloudUrl,
      adminKey: undefined as string | undefined,
      isSelfHosted: false,
    };
  }

  return {
    url: selfHostedUrl || cloudUrl || 'http://127.0.0.1:3210',
    adminKey: process.env.CONVEX_SELF_HOSTED_ADMIN_KEY,
    isSelfHosted: true,
  };
}

async function callConvex(kind: 'query' | 'mutation', path: string, args: Record<string, unknown>) {
  const config = getConvexConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.isSelfHosted && config.adminKey) {
    headers.Authorization = `Convex ${config.adminKey}`;
  }

  const res = await fetch(`${config.url}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path: `stage:${path}`, args }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex ${kind} failed (${res.status}): ${text}`);
  }

  const payload = (await res.json()) as ConvexResponse;
  if (payload.status === 'error') {
    throw new Error(payload.errorMessage || 'Unknown Convex error');
  }

  return payload.value;
}

export function convexQuery<T = any>(path: string, args: Record<string, unknown> = {}) {
  return callConvex('query', path, args) as Promise<T>;
}

export function convexMutation<T = any>(path: string, args: Record<string, unknown> = {}) {
  return callConvex('mutation', path, args) as Promise<T>;
}
