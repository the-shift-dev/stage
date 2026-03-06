export interface StageInferenceChatRequest {
  providerId?: string;
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  system?: string;
}

export interface StageInferenceClient {
  chat(request: StageInferenceChatRequest): Promise<any>;
  embed(request: {
    providerId?: string;
    model: string;
    input: string | string[];
  }): Promise<any>;
  image(request: {
    providerId?: string;
    model: string;
    prompt: string;
    size?: string;
    quality?: string;
    style?: string;
    numImages?: number;
    responseFormat?: 'url' | 'b64_json';
  }): Promise<any>;
  usage(filters?: {
    provider?: string;
    since?: string;
    until?: string;
    limit?: number;
  }): Promise<any>;
}

const BASE = '/api/v1/inference';

export function createInferenceClient(sessionId: string): StageInferenceClient {
  async function call<T>(
    path: string,
    opts?: {
      method?: string;
      body?: unknown;
      params?: Record<string, string>;
    },
  ): Promise<T> {
    let url = `${BASE}${path}`;
    if (opts?.params) {
      const query = new URLSearchParams(opts.params).toString();
      if (query) {
        url += `?${query}`;
      }
    }

    const res = await fetch(url, {
      method: opts?.method ?? 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Stage-Session': sessionId,
      },
      body: opts?.body === undefined ? undefined : JSON.stringify(opts.body),
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error?.message ?? `Inference API error (${res.status})`);
    }
    return json.data as T;
  }

  return {
    chat(request) {
      return call('/chat', { body: request });
    },
    embed(request) {
      return call('/embed', { body: request });
    },
    image(request) {
      return call('/images', { body: request });
    },
    usage(filters) {
      const params: Record<string, string> = {};
      if (filters?.provider) params.provider = filters.provider;
      if (filters?.since) params.since = filters.since;
      if (filters?.until) params.until = filters.until;
      if (filters?.limit !== undefined) params.limit = String(filters.limit);
      return call('/usage', { method: 'GET', params });
    },
  };
}
