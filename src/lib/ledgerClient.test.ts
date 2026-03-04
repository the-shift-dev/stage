import { afterEach, describe, expect, test } from "bun:test";
import { createLedgerClient } from "./ledgerClient";

describe("createLedgerClient", () => {
  const fetchCalls: { url: string; body: any }[] = [];
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchCalls.length = 0;
  });

  test("includes appContext in audit events", () => {
    globalThis.fetch = (async (url: string, init: any) => {
      fetchCalls.push({ url, body: JSON.parse(init.body) });
      return new Response("ok");
    }) as any;

    const client = createLedgerClient("sess-1", "svc-1", "tom@example.com", {
      stageAppId: "app-abc",
      authorEmail: "tom@example.com",
    });

    client.audit("read", { source: { service: "google-calendar" } });

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].body.stageAppId).toBe("app-abc");
    expect(fetchCalls[0].body.authorEmail).toBe("tom@example.com");
    expect(fetchCalls[0].body.operation).toBe("read");
    expect(fetchCalls[0].body.actor).toBe("tom@example.com");
    expect(fetchCalls[0].body.source).toEqual({ service: "google-calendar" });
  });

  test("omits appContext fields when not provided", () => {
    globalThis.fetch = (async (url: string, init: any) => {
      fetchCalls.push({ url, body: JSON.parse(init.body) });
      return new Response("ok");
    }) as any;

    const client = createLedgerClient("sess-1", "svc-1", "tom@example.com");
    client.audit("write");

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].body.stageAppId).toBeUndefined();
    expect(fetchCalls[0].body.authorEmail).toBeUndefined();
    expect(fetchCalls[0].body.operation).toBe("write");
  });

  test("auditPiiRead includes appContext and pii classification", () => {
    globalThis.fetch = (async (url: string, init: any) => {
      fetchCalls.push({ url, body: JSON.parse(init.body) });
      return new Response("ok");
    }) as any;

    const client = createLedgerClient("sess-1", "svc-1", "tom@example.com", {
      stageAppId: "app-abc",
      authorEmail: "tom@example.com",
    });

    client.auditPiiRead(["user.email", "user.phone"], {
      source: { service: "api" },
    });

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].body.stageAppId).toBe("app-abc");
    expect(fetchCalls[0].body.operation).toBe("read");
    expect(fetchCalls[0].body.dataRefs).toHaveLength(2);
    expect(fetchCalls[0].body.dataRefs[0]).toEqual({
      field: "user.email",
      classification: "pii",
    });
    expect(fetchCalls[0].body.dataRefs[1]).toEqual({
      field: "user.phone",
      classification: "pii",
    });
  });

  test("sends to ledger endpoint", () => {
    globalThis.fetch = (async (url: string, init: any) => {
      fetchCalls.push({ url, body: JSON.parse(init.body) });
      return new Response("ok");
    }) as any;

    const client = createLedgerClient("sess-1", "svc-1", "tom@example.com", {
      stageAppId: "app-abc",
      authorEmail: "tom@example.com",
    });

    client.audit("read");

    expect(fetchCalls[0].url).toBe("/api/v1/ledger/events");
  });
});
