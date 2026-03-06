/**
 * Google API client for Stage end-user auth.
 *
 * Provides a typed interface for calling Google APIs via the gateway proxy.
 * All requests are authenticated using the `shift_stage_user` cookie
 * (sent via `credentials: "include"`).
 */

export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

export interface GoogleClient {
  user: GoogleUser;
  isAuthenticated: boolean;

  /** Generic Google API call via the proxy. */
  api(
    service: string,
    path: string,
    opts?: { method?: string; params?: Record<string, string>; body?: any },
  ): Promise<any>;

  /** Google Drive convenience methods. */
  drive: {
    listFiles(query?: string, pageSize?: number): Promise<any>;
    getFile(fileId: string): Promise<any>;
  };

  /** Google Sheets convenience methods. */
  sheets: {
    getValues(spreadsheetId: string, range: string): Promise<any>;
  };

  /** Google Calendar convenience methods. */
  calendar: {
    listEvents(calendarId?: string, params?: Record<string, string>): Promise<any>;
  };
}

/**
 * Create a GoogleClient for the given user and session.
 * All API calls go through the gateway proxy (POST /api/v1/stage/google-proxy).
 */
export function createGoogleClient(user: GoogleUser, sessionId: string): GoogleClient {
  const proxyUrl = "/api/v1/stage/google-proxy";

  async function callProxy(
    service: string,
    path: string,
    opts?: { method?: string; params?: Record<string, string>; body?: any },
  ): Promise<any> {
    const res = await fetch(proxyUrl, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Stage-Session": sessionId,
      },
      body: JSON.stringify({
        service,
        path,
        method: opts?.method ?? "GET",
        params: opts?.params,
        body: opts?.body,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let message = `Google API proxy error (${res.status})`;
      try {
        const parsed = JSON.parse(text);
        if (parsed?.error?.message) message = parsed.error.message;
      } catch {
        if (text) message = `${message}: ${text.slice(0, 200)}`;
      }
      throw new Error(message);
    }
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error?.message ?? `Google API error (${res.status})`);
    }
    return json.data;
  }

  return {
    user,
    isAuthenticated: true,

    api: callProxy,

    drive: {
      listFiles(query?: string, pageSize?: number) {
        const params: Record<string, string> = {};
        if (query) params.q = query;
        if (pageSize) params.pageSize = String(pageSize);
        return callProxy("drive", "drive/v3/files", { params });
      },
      getFile(fileId: string) {
        return callProxy("drive", `drive/v3/files/${encodeURIComponent(fileId)}`, {
          params: { fields: "id,name,mimeType,size,modifiedTime,webViewLink" },
        });
      },
    },

    sheets: {
      getValues(spreadsheetId: string, range: string) {
        return callProxy(
          "sheets",
          `v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
        );
      },
    },

    calendar: {
      listEvents(calendarId = "primary", params?: Record<string, string>) {
        return callProxy("calendar", `calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
          params,
        });
      },
    },
  };
}
