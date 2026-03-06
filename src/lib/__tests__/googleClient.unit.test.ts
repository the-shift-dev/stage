import { afterEach, describe, expect, it, vi } from "vitest";
import { createGoogleClient } from "../googleClient";

describe("googleClient", () => {
  const user = { email: "user@example.com", name: "User", picture: "pic" };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(response: {
    ok: boolean;
    status: number;
    json?: () => Promise<unknown>;
    text?: () => Promise<string>;
  }) {
    const fn = vi.fn(() => Promise.resolve(response));
    globalThis.fetch = fn as unknown as typeof fetch;
    return fn;
  }

  it("builds proxy request for generic api()", async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { ok: true } }),
    });

    const client = createGoogleClient(user, "session-1");
    const data = await client.api("drive", "drive/v3/files", {
      method: "POST",
      params: { q: "name contains report" },
      body: { test: 1 },
    });

    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/stage/google-proxy");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect((init.headers as Record<string, string>)["X-Stage-Session"]).toBe(
      "session-1",
    );

    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      service: "drive",
      path: "drive/v3/files",
      method: "POST",
      params: { q: "name contains report" },
      body: { test: 1 },
    });
  });

  it("defaults method to GET", async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} }),
    });

    const client = createGoogleClient(user, "session-2");
    await client.api("sheets", "v4/spreadsheets/x/values/A1:B2");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.method).toBe("GET");
  });

  it("maps drive helpers to expected endpoints", async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { items: [] } }),
    });

    const client = createGoogleClient(user, "session-3");
    await client.drive.listFiles("name contains x", 10);
    await client.drive.listFiles();
    await client.drive.getFile("file id/with spaces");

    const firstBody = JSON.parse(
      String((fetchMock.mock.calls[0] as any[])[1].body),
    );
    expect(firstBody.service).toBe("drive");
    expect(firstBody.path).toBe("drive/v3/files");
    expect(firstBody.params).toEqual({
      q: "name contains x",
      pageSize: "10",
    });

    const secondBody = JSON.parse(
      String((fetchMock.mock.calls[1] as any[])[1].body),
    );
    expect(secondBody.params).toEqual({});

    const thirdBody = JSON.parse(
      String((fetchMock.mock.calls[2] as any[])[1].body),
    );
    expect(thirdBody.path).toContain("drive/v3/files/");
    expect(thirdBody.path).toContain(
      encodeURIComponent("file id/with spaces"),
    );
    expect(thirdBody.params.fields).toContain("webViewLink");
  });

  it("maps sheets and calendar helpers", async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { ok: true } }),
    });

    const client = createGoogleClient(user, "session-4");
    await client.sheets.getValues("sheet id", "A1:B2");
    await client.calendar.listEvents("primary", { maxResults: "5" });

    const sheetsBody = JSON.parse(
      String((fetchMock.mock.calls[0] as any[])[1].body),
    );
    expect(sheetsBody.service).toBe("sheets");
    expect(sheetsBody.path).toContain(encodeURIComponent("sheet id"));
    expect(sheetsBody.path).toContain(encodeURIComponent("A1:B2"));

    const calendarBody = JSON.parse(
      String((fetchMock.mock.calls[1] as any[])[1].body),
    );
    expect(calendarBody.service).toBe("calendar");
    expect(calendarBody.params).toEqual({ maxResults: "5" });
  });

  it("throws on non-ok response with JSON error body", async () => {
    mockFetch({
      ok: false,
      status: 403,
      text: async () =>
        JSON.stringify({ error: { message: "forbidden" } }),
    });

    const client = createGoogleClient(user, "session-5");
    await expect(client.api("drive", "x")).rejects.toThrow("forbidden");
  });

  it("throws on non-ok response with plain text body", async () => {
    mockFetch({
      ok: false,
      status: 502,
      text: async () => "Bad Gateway",
    });

    const client = createGoogleClient(user, "session-6");
    await expect(client.api("drive", "x")).rejects.toThrow(
      "Google API proxy error (502): Bad Gateway",
    );
  });

  it("throws on ok response with success:false", async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: async () => ({
        success: false,
        error: { message: "quota exceeded" },
      }),
    });

    const client = createGoogleClient(user, "session-7");
    await expect(client.api("drive", "x")).rejects.toThrow("quota exceeded");
  });
});
